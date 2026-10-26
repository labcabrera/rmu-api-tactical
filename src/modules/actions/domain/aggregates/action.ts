import { BaseAggregateRoot } from '../../../shared/domain/aggregates/base-aggregate.js';
import { randomUUID } from 'crypto';
import { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round.js';
import { UnprocessableEntityError, ValidationError } from '../../../shared/domain/errors/errors.js';
import { ActionCreatedEvent } from '../events/action.events.js';
import type { ProtectPosition } from '../value-objects/action-attack-modifiers.vo.js';
import { ActionParry } from '../value-objects/action-attack-parry.vo.js';
import { ActionAttack } from '../value-objects/action-attack.vo.js';
import { ActionManeuver } from '../value-objects/action-maneuver.vo.js';
import { ActionApProfile } from '../value-objects/action-ap-profile.vo.js';
import { ActionMovement } from '../value-objects/action-movement.vo.js';
import type { ActionSpell } from '../value-objects/action-spell.vo.js';
import { ActionResolution, type ForceReason } from '../value-objects/action-resolution.vo.js';
import { type ActionStatus, CLOSED_ACTION_STATUSES, IN_RESOLUTION_ACTION_STATUSES } from '../value-objects/action-status.vo.js';
import type { ActionType } from '../value-objects/action-type.vo.js';
import type { ManeuverActionPoints } from '../value-objects/maneuver-profile.vo.js';

/** Action phases of a round (§8.3). */
const ACTION_PHASES = 4;

/** How close an action is to being resolved (spec 011, §4). */
export type ActionReadiness = 'blocked' | 'unreachable' | 'ready' | 'optimal' | 'held' | 'in-resolution' | 'done';

/** AP of an action and its readiness, as of the actor round and phase they were computed with (not stored). */
export interface ActionApState {
  actionPoints: number | null;
  readiness: ActionReadiness | null;
  /** Penalty of resolving the action with its AP (0 or negative); null while it cannot be resolved or is resolved. */
  readinessPenalty: number | null;
}

/** AP an action takes from the ledger of a new action: the phase, the AP and how they are recorded. */
export interface DeclarationSpend {
  phase: number;
  ap: number;
  kind: 'spent' | 'instant';
}

/** What declaring an action does to the round of the actor (spec 011, §2). */
export interface DeclarationPlan {
  /** AP recorded on the new action; null when it takes none (forced). */
  spend: DeclarationSpend | null;
  /** Open actions of the actor that the new one interrupts. */
  interrupted: Action[];
}

export interface DeclarationRequest {
  actionType: ActionType;
  phaseStart: number;
  freeAction: boolean;
  forced?: ForceReason;
}

/** Table 9-7c: OB penalty of a protector by where it stands. */
const PROTECT_PENALTIES: Record<ProtectPosition, number> = {
  protector_between: -25,
  defender_between: -100,
  other: -50,
};

export interface ActionProps {
  id: string;
  gameId: string;
  actorId: string;
  round: number;
  actionType: ActionType;
  freeAction: boolean;
  phaseStart: number;
  phaseEnd: number | null;
  status: ActionStatus;
  actionPoints: number | null;
  movement: ActionMovement | null;
  attacks: ActionAttack[] | null;
  parries: ActionParry[] | null;
  maneuver: ActionManeuver | null;
  fatigue: number | null;
  description: string | null;
  /** How the action is resolved. Missing in actions stored before spec 011 (their AP come from their phases). */
  resolution?: ActionResolution | null;
  /** AP range of the action when it is not the one of its type: the maneuver's skill, standing up with Acrobatics. */
  apRange?: ManeuverActionPoints | null;
  /** Action of the previous round this one continues (open rounds, multi-round actions or held ones; spec 011, §5). */
  continuesActionId?: string | null;
  /** AP the continued action had at the end of its round: they count toward this one's AP. */
  carriedAp?: number | null;
  /** The spell of a `cast_spell` action (spec 030). */
  spell?: ActionSpell | null;
  owner: string;
  createdAt: Date;
  updatedAt: Date | null;
}

export class Action extends BaseAggregateRoot<ActionProps> {
  private constructor(
    public readonly id: string,
    public readonly gameId: string,
    public readonly actorId: string,
    public readonly round: number,
    public readonly actionType: ActionType,
    public readonly freeAction: boolean,
    public phaseStart: number,
    public phaseEnd: number | null,
    public status: ActionStatus,
    public actionPoints: number | null,
    public movement: ActionMovement | null,
    public attacks: ActionAttack[] | null,
    public parries: ActionParry[] | null,
    public maneuver: ActionManeuver | null,
    public fatigue: number | null,
    public description: string | null,
    public owner: string,
    public readonly createdAt: Date,
    public updatedAt: Date | null,
    public resolution: ActionResolution | null = null,
    public apRange: ManeuverActionPoints | null = null,
    public continuesActionId: string | null = null,
    public carriedAp: number | null = null,
    public spell: ActionSpell | null = null,
  ) {
    super(id);
  }

  /** AP and readiness computed for the response (see `refreshApState`); not stored. */
  apState?: ActionApState;

  static create(
    gameId: string,
    actorId: string,
    round: number,
    actionType: ActionType,
    freeAction: boolean,
    phaseStart: number,
    maneuver: ActionManeuver | null,
    description: string | null,
    owner: string,
    resolution: ActionResolution = ActionResolution.normal(),
    apRange: ManeuverActionPoints | null = null,
  ) {
    const action = new Action(
      randomUUID(),
      gameId,
      actorId,
      round,
      actionType,
      freeAction,
      phaseStart,
      null,
      'declared',
      null,
      null,
      null,
      null,
      maneuver,
      null,
      description,
      owner,
      new Date(),
      null,
      resolution,
      apRange,
    );
    action.apply(new ActionCreatedEvent(action));
    return action;
  }

  static fromProps(props: ActionProps): Action {
    return new Action(
      props.id,
      props.gameId,
      props.actorId,
      props.round,
      props.actionType,
      props.freeAction,
      props.phaseStart,
      props.phaseEnd,
      props.status,
      props.actionPoints,
      props.movement,
      props.attacks,
      props.parries,
      props.maneuver,
      props.fatigue,
      props.description,
      props.owner,
      props.createdAt,
      props.updatedAt,
      props.resolution ?? null,
      props.apRange ?? null,
      props.continuesActionId ?? null,
      props.carriedAp ?? null,
      props.spell ?? null,
    );
  }

  /**
   * The continuation of an action still open when its round ends (spec 011, §5): same type, data and resolution, in
   * the new round from phase 1, with the AP the action had (`carriedAp`). A held action goes on held; any other, declared,
   * and it takes 1 AP of phase 1 when that phase starts.
   */
  static continuationOf(previous: Action, round: number, carriedAp: number): Action {
    const action = new Action(
      randomUUID(),
      previous.gameId,
      previous.actorId,
      round,
      previous.actionType,
      previous.freeAction,
      1,
      null,
      previous.status === 'held' ? 'held' : 'declared',
      carriedAp,
      previous.movement ? structuredClone(previous.movement) : null,
      previous.attacks ? structuredClone(previous.attacks) : null,
      previous.parries ? structuredClone(previous.parries) : null,
      previous.maneuver ? structuredClone(previous.maneuver) : null,
      null,
      previous.description,
      previous.owner,
      new Date(),
      null,
      previous.effectiveResolution(),
      previous.apRange ? { ...previous.apRange } : null,
      previous.id,
      carriedAp,
      previous.spell ? structuredClone(previous.spell) : null,
    );
    action.apply(new ActionCreatedEvent(action));
    return action;
  }

  prepare() {
    if (this.actionType !== 'melee_attack' && this.actionType !== 'ranged_attack') {
      throw new Error('Action is not an attack');
    }
    if (this.status !== 'declared') {
      throw new Error('Action is not in a preparable state');
    }
  }

  /** The action spends an AP in the phase: it is not free, it started and it was not over before the phase. */
  spendsApInPhase(phase: number): boolean {
    if (this.freeAction || this.phaseStart > phase) {
      return false;
    }
    return this.phaseEnd === null || this.phaseEnd === undefined || this.phaseEnd >= phase;
  }

  /**
   * AP an actor spent in an action phase, from its actions of the round: 1 when an action spans the phase (an action
   * still in progress counts), 0 otherwise. One action phase gives one AP (§8.3 Action Phases).
   */
  static spentApInPhase(actions: Action[], phase: number): number {
    return actions.some(action => action.spendsApInPhase(phase)) ? 1 : 0;
  }

  /** As `spentApInPhase`, counting only the actions already completed in the phase. */
  static completedApInPhase(actions: Action[], phase: number): number {
    return actions.some(action => action.status === 'completed' && action.phaseEnd === phase && action.spendsApInPhase(phase)) ? 1 : 0;
  }

  // --- Action points: ledger, profile, readiness and declaration (spec 011) ---

  isAttack(): boolean {
    return this.actionType === 'melee_attack' || this.actionType === 'ranged_attack';
  }

  /** Stored before spec 011: without a resolution, its AP come from the phases it spans when the ledger has none. */
  isLegacy(): boolean {
    return this.resolution === null || this.resolution === undefined;
  }

  /** A free attack stored before spec 011: it is read as forced by the game master with the full AP (§6). */
  isLegacyFreeAttack(): boolean {
    return this.freeAction && this.isAttack();
  }

  /** The resolution, reading a legacy free attack as forced by the game master. */
  effectiveResolution(): ActionResolution {
    if (this.resolution) {
      return this.resolution;
    }
    return this.isLegacyFreeAttack() ? ActionResolution.forced('gm') : ActionResolution.normal();
  }

  isForced(): boolean {
    return this.effectiveResolution().mode === 'forced';
  }

  /** The attack takes the AP penalty: not an instantaneous or legacy free action, nor forced by an effect. */
  takesApPenalty(): boolean {
    return !this.freeAction && this.effectiveResolution().reason !== 'effect';
  }

  /**
   * An open action that takes 1 AP of each new phase (spec 011, §5): declared, not instantaneous nor forced. Legacy
   * actions are left out: their ledger is filled from the phases they span.
   */
  carriesOnPhaseChange(): boolean {
    return this.status === 'declared' && !this.freeAction && !this.isForced() && !this.isLegacy();
  }

  /**
   * Takes 1 AP of `phase` for the open action when the phase starts (spec 011, §5): spent if the phase has free
   * capacity, else recorded as `lost` (the action does not advance). Nothing when the action already has an entry in
   * the phase, so it can run again. Returns the entry kind recorded, or undefined.
   */
  advanceToPhase(actorRound: ActorRound, phase: number): 'spent' | 'lost' | undefined {
    if (!this.carriesOnPhaseChange() || phase < this.phaseStart || actorRound.ledgerOf(this.id).some(entry => entry.phase === phase)) {
      return undefined;
    }
    const kind = actorRound.freeCapacity(phase) > 0 ? 'spent' : 'lost';
    actorRound.spend(phase, this.id, 1, kind);
    this.actionPoints = this.apOf(actorRound, phase);
    this.updatedAt = new Date();
    return kind;
  }

  /**
   * What happens to the action when its round ends (spec 011, §5), with the open rounds option of the game:
   * - `none`: it is closed or under resolution, nothing to do;
   * - `expired`: an instantaneous action, or an open one without open rounds that is not multi-round;
   * - `carried`: it goes on in the next round (open rounds, a multi-round profile, or held).
   * An actor that cannot act any more is handled by the caller (the action is interrupted).
   */
  roundEndOutcome(openRounds: boolean): 'none' | 'expired' | 'carried' {
    if (this.status !== 'declared' && this.status !== 'held') {
      return 'none';
    }
    if (this.freeAction) {
      return 'expired';
    }
    if (this.status === 'held' || openRounds || this.apProfile().multiRound) {
      return 'carried';
    }
    return 'expired';
  }

  /** Over in its round: completed, interrupted, expired or carried to the next one. */
  isClosed(): boolean {
    return CLOSED_ACTION_STATUSES.includes(this.status);
  }

  /**
   * AP range of the action (spec 011, §3): the stored one (maneuver skill, standing up with Acrobatics) or its type's.
   * An instantaneous action can be resolved without AP.
   */
  apProfile(): ActionApProfile {
    let profile: ActionApProfile;
    if (this.apRange && this.actionType === 'maneuver') {
      profile = ActionApProfile.forManeuver(this.apRange);
    } else if (this.apRange) {
      profile = new ActionApProfile(this.apRange.min, this.apRange.max, ActionApProfile.forAction(this.actionType).penaltyPerMissing);
    } else {
      profile = ActionApProfile.forAction(this.actionType);
    }
    if (this.freeAction && !this.isAttack()) {
      return new ActionApProfile(0, profile.max, profile.penaltyPerMissing, profile.multiRound);
    }
    return profile;
  }

  /**
   * AP spent on the action: the ones carried from the previous round (a continuation) plus its `spent` and `instant`
   * entries in the ledger of its actor round. A legacy free attack
   * has the full AP of its profile. A legacy action without entries counts 1 AP per phase it spans (up to the current
   * phase while open), or its stored AP once resolved; an instantaneous legacy action, none.
   */
  apOf(actorRound: ActorRound | null | undefined, currentPhase?: number | null): number {
    if (this.isLegacyFreeAttack()) {
      return this.apProfile().max;
    }
    const carried = this.carriedAp ?? 0;
    if (actorRound && actorRound.ledgerOf(this.id).length > 0) {
      return carried + actorRound.spentByAction(this.id);
    }
    if (!this.isLegacy() || this.freeAction) {
      return carried;
    }
    if (this.actionPoints !== null && this.actionPoints !== undefined && this.status !== 'declared' && this.status !== 'held') {
      return this.actionPoints;
    }
    const end = Math.min(this.phaseEnd ?? currentPhase ?? this.phaseStart, ACTION_PHASES);
    return Math.max(0, end - this.phaseStart + 1);
  }

  /**
   * Readiness of the action (spec 011, §4) with the AP it has now and the capacity its actor has left from
   * `currentPhase` (null or past phase 4 outside the action phases: no capacity left).
   *
   * Below its minimum, the action is `blocked` while it can still get there and `unreachable` when it cannot. It can
   * get there with the capacity left in the round or, with `openRounds` (the game option, on by default) or a
   * multi-round profile, in the next round, where it goes on (§5). It is `unreachable` anyway when the actor cannot act
   * (dead, dying, unconscious or without AP this round): it will be interrupted.
   */
  readiness(actorRound: ActorRound | null | undefined, currentPhase: number | null | undefined, openRounds = true): ActionApState {
    const byStatus = this.readinessByStatus();
    const actionPoints = this.apOf(actorRound, currentPhase);
    if (byStatus === 'done' || byStatus === 'in-resolution') {
      return { actionPoints, readiness: byStatus, readinessPenalty: null };
    }
    const profile = this.apProfile();
    const resolution = this.effectiveResolution();
    if (resolution.mode === 'forced') {
      const penalty = resolution.reason === 'effect' ? 0 : profile.penaltyFor(actionPoints);
      return { actionPoints, readiness: byStatus ?? (penalty === 0 ? 'optimal' : 'ready'), readinessPenalty: penalty };
    }
    if (actionPoints >= profile.max) {
      return { actionPoints, readiness: byStatus ?? 'optimal', readinessPenalty: 0 };
    }
    if (profile.reachesMin(actionPoints)) {
      return { actionPoints, readiness: byStatus ?? 'ready', readinessPenalty: profile.penaltyFor(actionPoints) };
    }
    if (byStatus) {
      return { actionPoints, readiness: byStatus, readinessPenalty: null };
    }
    if (actorRound && !actorRound.canAct()) {
      return { actionPoints, readiness: 'unreachable', readinessPenalty: null };
    }
    if (openRounds || profile.multiRound) {
      return { actionPoints, readiness: 'blocked', readinessPenalty: null };
    }
    const phase = currentPhase ?? ACTION_PHASES + 1;
    const left = actorRound && phase <= ACTION_PHASES ? actorRound.remainingCapacity(phase) : 0;
    return { actionPoints, readiness: actionPoints + left >= profile.min ? 'blocked' : 'unreachable', readinessPenalty: null };
  }

  /** Readiness that only depends on the status: held, under resolution or done (undefined otherwise). */
  readinessByStatus(): ActionReadiness | undefined {
    if (this.isClosed()) {
      return 'done';
    }
    if (this.status === 'held') {
      return 'held';
    }
    if (IN_RESOLUTION_ACTION_STATUSES.includes(this.status)) {
      return 'in-resolution';
    }
    return undefined;
  }

  /** Computes the AP and readiness of the response, and keeps `actionPoints` in step with the ledger. */
  refreshApState(actorRound: ActorRound | null | undefined, currentPhase: number | null | undefined, openRounds = true): ActionApState {
    this.apState = this.readiness(actorRound, currentPhase, openRounds);
    if (actorRound) {
      this.actionPoints = this.apState.actionPoints;
    }
    return this.apState;
  }

  /**
   * A step that fixes the result (preparing an attack, resolving a maneuver or movement, completing a simple action)
   * needs the minimum AP of the action, unless it is forced (spec 011, §4).
   */
  checkResolvable(actorRound: ActorRound, currentPhase: number): void {
    if (this.isClosed()) {
      throw new ValidationError(`Action ${this.id} is already ${this.status}`, 'err-action-closed');
    }
    if (this.isForced()) {
      return;
    }
    const state = this.readiness(actorRound, currentPhase);
    if (state.readiness === 'blocked' || state.readiness === 'unreachable') {
      const min = this.apProfile().min;
      throw new ValidationError(
        `The action has ${state.actionPoints} action points, below the ${min} it needs`,
        'err-action-points-below-min',
      );
    }
  }

  /**
   * A legacy action without ledger entries gets them from the phases it spans up to `upToPhase`, before the ledger
   * changes for it. Returns whether the ledger changed.
   */
  fillLegacyLedger(actorRound: ActorRound, upToPhase: number): boolean {
    if (!this.isLegacy() || this.freeAction || actorRound.ledgerOf(this.id).length > 0 || upToPhase < this.phaseStart) {
      return false;
    }
    const before = actorRound.apLedger.length;
    actorRound.fillLedgerFromActions([this], upToPhase);
    return actorRound.apLedger.length !== before;
  }

  /**
   * Ends the action (completed, interrupted, or expired or carried at the end of the round): its AP and phases come
   * from the ledger; `phaseEnd` is the last phase it spent AP in, or when it spent none, the current phase (completed)
   * or its first one.
   */
  close(
    actorRound: ActorRound | null | undefined,
    currentPhase: number,
    status: 'completed' | 'interrupted' | 'expired' | 'carried' = 'completed',
  ): void {
    const entries = actorRound ? actorRound.ledgerOf(this.id).filter(entry => entry.kind !== 'lost') : [];
    this.actionPoints = this.apOf(actorRound, currentPhase);
    if (entries.length > 0) {
      this.phaseStart = Math.min(...entries.map(entry => entry.phase));
      this.phaseEnd = Math.max(...entries.map(entry => entry.phase));
    } else {
      this.phaseEnd = status === 'completed' ? Math.max(this.phaseStart, currentPhase) : this.phaseStart;
    }
    this.status = status;
    this.updatedAt = new Date();
  }

  /** `PATCH /spend-ap`: one more AP of the current phase on the open action (spec 011, §2). */
  spendExtraAp(actorRound: ActorRound, currentPhase: number): void {
    if (this.status !== 'declared') {
      throw new ValidationError(`Only a declared action can take more action points, not a ${this.status} one`, 'err-action-not-open');
    }
    if (this.freeAction) {
      throw new ValidationError('An instantaneous action takes no more action points', 'err-action-instant');
    }
    this.fillLegacyLedger(actorRound, currentPhase);
    actorRound.spend(currentPhase, this.id, 1);
    this.actionPoints = this.apOf(actorRound, currentPhase);
    this.updatedAt = new Date();
  }

  /** `PATCH /hold`: the game master holds an action that has its maximum AP, to trigger it later (spec 011, §4). */
  hold(actorRound: ActorRound, currentPhase: number): void {
    if (this.status !== 'declared') {
      throw new ValidationError(`Only a declared action can be held, not a ${this.status} one`, 'err-action-not-open');
    }
    const actionPoints = this.apOf(actorRound, currentPhase);
    if (actionPoints < this.apProfile().max) {
      throw new ValidationError(
        `An action is held with its maximum action points (${this.apProfile().max}), it has ${actionPoints}`,
        'err-action-hold-below-max',
      );
    }
    this.actionPoints = actionPoints;
    this.status = 'held';
    this.updatedAt = new Date();
  }

  /**
   * `PATCH /force` (spec 011, §6): the action is resolved out of its turn. A withdrawal or passing through needs an AP
   * already spent and takes the next free AP of the actor: of the current phase if it has one, else of the next phase
   * with capacity. An effect takes none and the game master keeps the ones spent.
   */
  force(actorRound: ActorRound, currentPhase: number, reason: ForceReason, note?: string): void {
    if (this.status !== 'declared' && this.status !== 'held') {
      throw new ValidationError(`Only an open action can be forced, not a ${this.status} one`, 'err-action-not-open');
    }
    const resolution = ActionResolution.forced(reason, note);
    if (resolution.apSource === 'next-phase') {
      if (this.apOf(actorRound, currentPhase) < 1) {
        throw new ValidationError(`A ${reason} needs an action point already spent on the action`, 'err-action-force-needs-ap');
      }
      this.fillLegacyLedger(actorRound, currentPhase);
      const phase = Action.nextFreePhase(actorRound, currentPhase);
      if (phase === undefined) {
        throw new ValidationError('The actor has no action points left this round', 'err-action-points-exceeded');
      }
      actorRound.spend(phase, this.id, 1);
    }
    this.resolution = resolution;
    this.actionPoints = this.apOf(actorRound, currentPhase);
    this.updatedAt = new Date();
  }

  /** First phase from `fromPhase` with free capacity. */
  private static nextFreePhase(actorRound: ActorRound, fromPhase: number): number | undefined {
    for (let phase = Math.max(1, fromPhase); phase <= ACTION_PHASES; phase++) {
      if (actorRound.freeCapacity(phase) > 0) {
        return phase;
      }
    }
    return undefined;
  }

  /**
   * Checks a new action of an actor against its round and says what it does to it (§8.1, §8.3, Table 8-1; spec 011,
   * §2 and §6).
   *
   * - A flatfooted actor declares nothing. An attack is never instantaneous.
   * - A normal action starts in the current phase, which must have capacity (lost to surprise, Hold Kind…).
   * - The first instantaneous action of the round takes 0 AP; the next ones 1 AP of free capacity.
   * - Any other action takes 1 AP of free capacity of the phase, and interrupts the open action of the actor (its AP
   *   stay spent), except when it is a movement or the open action is a melee attack the actor parried with.
   * - A forced action (an effect, the game master) takes no AP and interrupts nothing; a withdrawal or passing through
   *   needs an action already under way.
   *
   * `actions` are the actor's actions of the round; `roundActions` every action of the round, to find its parries.
   */
  static checkDeclaration(
    actorRound: ActorRound,
    actions: Action[],
    request: DeclarationRequest,
    currentPhase: number,
    roundActions: Action[] = actions,
  ): DeclarationPlan {
    const attack = request.actionType === 'melee_attack' || request.actionType === 'ranged_attack';
    if (request.freeAction && attack) {
      throw new ValidationError('An attack cannot be an instantaneous action', 'err-action-free-not-allowed');
    }
    if (request.forced) {
      if (ActionResolution.apSourceOf(request.forced) === 'next-phase') {
        throw new ValidationError(`A new action cannot be forced as a ${request.forced}`, 'err-action-force-invalid-reason');
      }
      return { spend: null, interrupted: [] };
    }
    if (attack && actorRound.isFearBlockingAttacks()) {
      throw new ValidationError('A routed or broken actor cannot attack (workspace spec 022)', 'err-action-fear');
    }
    if (actorRound.hasEffect('flatfooted')) {
      throw new ValidationError('A flatfooted actor cannot declare actions this round', 'err-action-flatfooted');
    }
    const phase = request.phaseStart;
    if (!Number.isInteger(phase) || phase < 1 || phase > ACTION_PHASES || phase !== currentPhase) {
      throw new ValidationError(
        `An action is declared in the current phase (${currentPhase}), not in ${phase}`,
        'err-action-invalid-phase',
      );
    }
    if (actorRound.capacityOf(phase) === 0) {
      throw new ValidationError(`The actor has no action points in phase ${phase}`, 'err-action-surprised-phase');
    }
    if (request.freeAction) {
      const first = !actions.some(action => action.freeAction && !action.isAttack());
      if (!first && actorRound.freeCapacity(phase) < 1) {
        throw new ValidationError(`The actor has no action points left in phase ${phase}`, 'err-action-points-exceeded');
      }
      return { spend: { phase, ap: first ? 0 : 1, kind: 'instant' }, interrupted: [] };
    }
    if (actorRound.freeCapacity(phase) < 1) {
      throw new ValidationError(`The actor has no action points left in phase ${phase}`, 'err-action-points-exceeded');
    }
    const interrupted = request.actionType === 'movement' ? [] : actions.filter(action => action.isInterruptible());
    const parried = interrupted.find(action => Action.parriedWith(action, roundActions));
    if (parried) {
      throw new ValidationError(
        `The actor parried with the melee attack ${parried.id}: it has to complete it first`,
        'err-action-must-complete-parried',
      );
    }
    return { spend: { phase, ap: 1, kind: 'spent' }, interrupted };
  }

  /** An open action that a new one interrupts: declared, not instantaneous, forced nor a movement (spec 011, §2). */
  isInterruptible(): boolean {
    return this.status === 'declared' && !this.freeAction && this.actionType !== 'movement' && !this.isForced();
  }

  /**
   * The actor already parried with this melee attack (§8.3): some foe's attack of the round, updated since the melee
   * attack was declared, has a parry of the actor that is not carried over.
   */
  static parriedWith(action: Action, roundActions: Action[]): boolean {
    if (action.actionType !== 'melee_attack') {
      return false;
    }
    const since = new Date(action.createdAt).getTime();
    return roundActions.some(
      other =>
        other.id !== action.id &&
        other.actorId !== action.actorId &&
        new Date(other.updatedAt ?? other.createdAt).getTime() >= since &&
        (other.parries || []).some(parry => parry.actorId === action.actorId && parry.parry > 0 && !parry.carriedOver),
    );
  }

  /** Records on the actor round the AP of the new action and closes the actions it interrupts. */
  applyDeclaration(actorRound: ActorRound, plan: DeclarationPlan, currentPhase: number): void {
    plan.interrupted.forEach(action => {
      action.fillLegacyLedger(actorRound, currentPhase - 1);
      action.close(actorRound, currentPhase, 'interrupted');
    });
    if (plan.spend) {
      actorRound.spend(plan.spend.phase, this.id, plan.spend.ap, plan.spend.kind);
    }
    this.actionPoints = this.apOf(actorRound, currentPhase);
  }

  setAttackBo(attackName: string, currentBo: number) {
    if (!this.attacks) return;
    const attack = this.attacks?.find(a => a.attackName === attackName);
    if (!attack || !attack.modifiers) return;
    attack.modifiers.bo = currentBo;
  }

  /**
   * Parry and protect options of the action's melee attacks, one per defender and per protector of each target.
   * A defender who already parried this attacker in an earlier action of the round keeps that parry, fixed and
   * already paid (§9.6 Parrying). A protector gives OB less the Table 9-7c penalty for its position, offset by its
   * Protect skill without turning into a bonus; it can protect without the skill (§9.7 Protecting Others).
   */
  processParryOptions(actorRounds: ActorRound[], actions: Action[], phase: number) {
    if (!this.attacks || this.attacks.length === 0) {
      return;
    }
    this.parries = [];
    for (const attack of this.attacks) {
      if (attack.type !== 'melee') {
        continue;
      }
      const attackTarget = actorRounds.find(t => t.actorId === attack.modifiers.targetId)!;
      const hasParry = this.parries.some(p => p.actorId === attackTarget.actorId && p.parryType === 'parry');
      if (!hasParry && Action.canParry(attackTarget.actorId, actions, phase)) {
        const carried = this.findCarriedOverParry(attackTarget.actorId, actions);
        if (carried > 0) {
          this.parries.push(
            new ActionParry(
              randomUUID(),
              attackTarget.actorId,
              attackTarget.actorId,
              'parry',
              carried,
              carried,
              undefined,
              undefined,
              true,
            ),
          );
        } else {
          // The penalties of the defender cap its parry.
          const maxBo = attackTarget.getAvailableParry();
          if (maxBo > 0) {
            this.parries.push(new ActionParry(randomUUID(), attackTarget.actorId, attackTarget.actorId, 'parry', maxBo, 0));
          }
        }
      }
      for (const protectorId of attack.protectors || []) {
        const protector = actorRounds.find(t => t.actorId === protectorId)!;
        const duplicated = this.parries.some(
          p => p.actorId === protectorId && p.targetActorId === attackTarget.actorId && p.parryType === 'protect',
        );
        if (duplicated || !Action.canParry(protector.actorId, actions, phase)) {
          continue;
        }
        const position = attack.protectorPositions?.[protectorId] ?? 'other';
        const penalty = Action.protectPenalty(position, protector.defense.protect || 0);
        const protectValue = Math.max(0, protector.getAvailableParry() + penalty);
        if (protectValue > 0) {
          this.parries.push(
            new ActionParry(randomUUID(), protector.actorId, attackTarget.actorId, 'protect', protectValue, 0, penalty, position),
          );
        }
      }
    }
  }

  /** Table 9-7c penalty by the protector's position, offset by its Protect skill but never a bonus. */
  static protectPenalty(position: ProtectPosition, protectSkill: number): number {
    return Math.min(0, PROTECT_PENALTIES[position] + protectSkill);
  }

  /**
   * The actor can parry in this phase (§9.6 Parrying, §8.3): the last action it spent AP on, up to this phase, is a
   * melee attack, still in progress or completed. Movement does not interrupt the melee, and free actions spend no
   * AP.
   */
  static canParry(actorId: string, actions: Action[], phase: number): boolean {
    const lastPhase = (action: Action) => Math.min(action.phaseEnd ?? phase, phase);
    const last = actions
      .filter(a => a.actorId === actorId && !a.freeAction && a.actionType !== 'movement' && a.phaseStart <= phase)
      .sort((a, b) => lastPhase(b) - lastPhase(a) || b.phaseStart - a.phaseStart)[0];
    return last?.actionType === 'melee_attack';
  }

  /** OB the defender already gave to parry this attacker in an earlier, applied action of the round (0 if none). */
  private findCarriedOverParry(defenderId: string, actions: Action[]): number {
    return actions
      .filter(a => a.id !== this.id && a.actorId === this.actorId && a.round === this.round && a.status === 'completed')
      .flatMap(a => a.parries || [])
      .filter(p => p.actorId === defenderId && p.targetActorId === defenderId && p.parryType === 'parry')
      .reduce((max, p) => Math.max(max, p.parry || 0), 0);
  }

  hasPendingAttackRolls(): boolean {
    if (this.actionType !== 'melee_attack' && this.actionType !== 'ranged_attack') {
      throw new ValidationError('Action is not an attack');
    }
    if (!this.attacks || this.attacks.length === 0) throw new ValidationError('Action has no attacks declared');
    return this.attacks.some(a => !a.roll || !a.roll.roll);
  }

  hasPendingCriticalRolls(): boolean {
    if (this.actionType !== 'melee_attack' && this.actionType !== 'ranged_attack') {
      throw new ValidationError('Action is not an attack');
    }
    if (!this.attacks || this.attacks.length === 0) throw new ValidationError('Action has no attacks declared');
    return this.attacks.some(attack => attack.results?.criticals?.some(critical => !critical.result));
  }

  hasPendingFumbleRolls(): boolean {
    if (this.actionType !== 'melee_attack' && this.actionType !== 'ranged_attack') {
      throw new ValidationError('Action is not an attack');
    }
    if (!this.attacks || this.attacks.length === 0) throw new ValidationError('Action has no attacks declared');
    return this.attacks.some(attack => attack.results?.fumble && !attack.roll?.fumbleRoll);
  }

  /** Prepared attacks wait for the parries, when there are any to declare, and then for their rolls. */
  markPrepared(): void {
    this.status = this.parries && this.parries.length > 0 ? 'parry' : 'pending_roll';
  }

  /**
   * Recomputes the status of every attack and derives the action's: `pending_roll` while any attack waits for a
   * roll (attack, critical or fumble), `completed` when all are applied, `pending_apply` otherwise.
   */
  refreshAttackStatuses(): void {
    if (!this.attacks || this.attacks.length === 0) {
      return;
    }
    this.attacks.forEach(attack => (attack.status = ActionAttack.calculateStatus(attack)));
    const statuses = this.attacks.map(attack => attack.status);
    if (statuses.every(status => status === 'completed')) {
      this.status = 'completed';
    } else if (statuses.some(status => status !== 'pending_apply' && status !== 'completed')) {
      this.status = 'pending_roll';
    } else {
      this.status = 'pending_apply';
    }
  }

  completeAttacks(): void {
    this.attacks?.forEach(attack => (attack.status = 'completed'));
    this.status = 'completed';
  }

  getAttackByName(attackName: string): ActionAttack {
    if (!this.attacks) throw new ValidationError('Action has no attacks declared');
    const result = this.attacks.find(a => a.attackName === attackName);
    if (!result) throw new ValidationError(`Attack ${attackName} not found in action ${this.id}`);
    return result;
  }

  checkValidParryDeclaration() {
    //this.checkValidAttack('in_progress');
  }

  checkValidRollDeclaration() {
    //this.checkValidAttack('in_progress');
  }

  checkValidCriticalRollDeclaration(attackName: string, criticalKey: string, roll: number) {
    //this.checkValidAttack('in_progress');
    if (!attackName) throw new ValidationError('Attack name is required');
    if (!criticalKey) throw new ValidationError('Critical key is required');
    if (!roll || roll < 1 || roll > 100) throw new ValidationError('Critical roll must be between 1 and 100');
    const attack = this.attacks!.find(a => a.attackName === attackName);
    if (!attack) throw new ValidationError(`Attack ${attackName} not found in action ${this.id}`);
    if (!attack.roll || !attack.roll.roll) {
      throw new ValidationError(`Main roll not found in attack ${attackName} of action ${this.id}`);
    }
    if (!attack.results?.criticals?.some(critical => critical.key === criticalKey)) {
      throw new ValidationError(`Critical ${criticalKey} not found in attack ${attackName} of action ${this.id}`);
    }
  }

  checkValidApplyResults() {
    if (this.actionType !== 'melee_attack' && this.actionType !== 'ranged_attack') {
      throw new ValidationError('Action is not an attack');
    }
    if (this.status === 'completed') {
      throw new ValidationError('Attack already completed');
    }
  }

  processFatigue(fatigueMultiplier: number | null): void {
    if (this.actionPoints === null || this.actionPoints === undefined) {
      throw new Error('Action does not have action points defined');
    }
    let value: number | null = null;
    switch (this.actionType) {
      case 'movement':
        value = this.getMovementFatigue();
        break;
      case 'melee_attack':
      case 'ranged_attack':
        value = this.getCombatFatigue();
        break;
    }
    if (value) {
      value = this.actionPoints * value;
    }
    if (value && fatigueMultiplier) {
      value = value * fatigueMultiplier;
    }
    this.fatigue = value;
  }

  private getCombatFatigue(): number | null {
    if (!this.attacks || this.attacks.length === 0) {
      throw new UnprocessableEntityError('Action does not have attack data');
    }
    // check every 6 rounds only for melee attacks
    return this.attacks.some(e => e.type === 'melee') ? 4.16 : null;
  }

  applyParrysToAttacks() {
    this.attacks?.forEach(attack => {
      const targetId = attack.modifiers.targetId;
      const totalParry = this.parries?.filter(p => p.targetActorId === targetId).reduce((sum, p) => sum + p.parry, 0) || 0;
      attack.modifiers.parry = totalParry;
    });
  }

  getProps(): ActionProps {
    return this.toProps();
  }

  toProps(): ActionProps {
    return {
      id: this.id,
      gameId: this.gameId,
      actorId: this.actorId,
      round: this.round,
      actionType: this.actionType,
      freeAction: this.freeAction,
      phaseStart: this.phaseStart,
      phaseEnd: this.phaseEnd,
      status: this.status,
      actionPoints: this.actionPoints,
      movement: this.movement,
      attacks: this.attacks,
      parries: this.parries,
      maneuver: this.maneuver,
      fatigue: this.fatigue,
      description: this.description,
      resolution: this.resolution,
      apRange: this.apRange,
      continuesActionId: this.continuesActionId,
      carriedAp: this.carriedAp,
      spell: this.spell,
      owner: this.owner,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private getMovementFatigue(): number | null {
    if (this.movement?.modifiers.skillId) {
      switch (this.movement.modifiers.skillId) {
        case 'climbing':
        case 'swimming':
          // check every 5 min
          return 4.16;
        default:
          break;
      }
    }
    return this.getRunningFatigue();
  }

  private getRunningFatigue(): number | null {
    if (!this.movement || !this.movement.modifiers || !this.movement.modifiers.pace) {
      throw new Error('Action does not have movement data');
    }
    switch (this.movement.modifiers.pace) {
      case 'jog':
        // check every 5 min
        return 0.14;
      case 'run':
        // check every 1 min
        return 4.16;
      case 'sprint':
        // check every 2 rounds
        return 12.5;
      case 'dash':
        // check every round
        return 25;
    }
    return null;
  }

  private checkValidAttack(expectedStatus: string) {
    if (this.actionType !== 'melee_attack' && this.actionType !== 'ranged_attack') {
      throw new ValidationError('Action is not an attack');
    } else if (this.status !== expectedStatus) {
      throw new ValidationError('Attack is not in progress');
    } else if (!this.attacks || this.attacks.length === 0) {
      throw new ValidationError('Attack has no attacks declared');
    }
  }
}
