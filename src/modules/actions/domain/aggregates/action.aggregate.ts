import { AggregateRoot } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import { UnprocessableEntityError, ValidationError } from '../../../shared/domain/errors';
import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { ActionCreatedEvent } from '../events/action-events';
import { ProtectPosition } from '../value-objects/action-attack-modifiers.vo';
import { ActionParry } from '../value-objects/action-attack-parry.vo';
import { ActionAttack } from '../value-objects/action-attack.vo';
import { ActionManeuver } from '../value-objects/action-maneuver.vo';
import { ActionMovement } from '../value-objects/action-movement.vo';
import { ActionStatus } from '../value-objects/action-status.vo';
import { ActionType } from '../value-objects/action-type.vo';

/** Action points of a round (§8.3). */
const MAX_ACTION_POINTS = 4;

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
  owner: string;
  createdAt: Date;
  updatedAt: Date | null;
}

export class Action extends AggregateRoot<DomainEvent<Action>> {
  private constructor(
    public readonly id: string,
    public readonly gameId: string,
    public readonly actorId: string,
    public readonly round: number,
    public readonly actionType: ActionType,
    public readonly freeAction: boolean,
    public readonly phaseStart: number,
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
  ) {
    super();
  }

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
    );
  }

  prepare() {
    if (this.actionType !== 'melee_attack' && this.actionType !== 'ranged_attack') {
      throw new Error('Action is not an attack');
    }
    if (this.status !== 'declared') {
      throw new Error('Action is not in a preparable state');
    }
  }

  setActionPoints(currentPhase: number) {
    if (this.freeAction) {
      this.actionPoints = 0;
    } else {
      this.actionPoints = currentPhase - this.phaseStart + 1;
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

  /**
   * Checks a new action of an actor against its round (§8.1, §8.3, Table 8-1): a flatfooted actor declares nothing;
   * the phases a surprised actor lost are blocked; an action cannot start in a phase another one of the actor still
   * holds, nor go over the AP left; only the first instantaneous action of the round is free (the next one costs 1 AP).
   */
  static checkDeclaration(actorRound: ActorRound, actions: Action[], phaseStart: number, freeAction: boolean, currentPhase: number): void {
    if (actorRound.hasEffect('flatfooted')) {
      throw new ValidationError('A flatfooted actor cannot declare actions this round', 'err-action-flatfooted');
    }
    const maxPhase = actorRound.actionPoints || MAX_ACTION_POINTS;
    if (!Number.isInteger(phaseStart) || phaseStart < 1 || phaseStart > maxPhase) {
      throw new ValidationError(`An action starts in a phase from 1 to ${maxPhase}`, 'err-action-invalid-phase');
    }
    const lost = actorRound.getLostActionPoints();
    if (phaseStart <= lost) {
      throw new ValidationError(`A surprised actor loses the first ${lost} action points of the round`, 'err-action-surprised-phase');
    }
    if (freeAction) {
      if (actions.some(action => action.freeAction)) {
        throw new ValidationError('Only the first instantaneous action of the round is free', 'err-action-free-limit');
      }
      return;
    }
    const held = actions.filter(action => !action.freeAction);
    if (held.some(action => phaseStart >= action.phaseStart && phaseStart <= (action.phaseEnd ?? maxPhase))) {
      throw new ValidationError(`Phase ${phaseStart} is already taken by another action of the actor`, 'err-action-phase-overlap');
    }
    const spent = held.reduce((sum, action) => sum + action.heldActionPoints(currentPhase), 0);
    if (spent + 1 > maxPhase - lost) {
      throw new ValidationError(`The actor has no action points left this round`, 'err-action-points-exceeded');
    }
  }

  /** AP the action holds: the phases it spans, up to the current one while it is in progress. */
  private heldActionPoints(currentPhase: number): number {
    const end = this.phaseEnd ?? Math.max(currentPhase, this.phaseStart);
    return Math.max(0, end - this.phaseStart + 1);
  }

  addAttacks(attackNames: string[] | undefined) {
    if (!attackNames || attackNames.length === 0) {
      return;
    }
    if (!this.attacks) {
      this.attacks = [];
    }
    attackNames.forEach(attackName => {
      const attack = {
        attackName: attackName,
        type: this.actionType === 'melee_attack' ? 'melee' : 'ranged',
        modifiers: {
          bo: 0,
          calledShot: 'none',
          calledShotPenalty: 0,
          positionalSource: 'none',
          positionalTarget: 'none',
          restrictedQuarters: 'none',
          cover: 'none',
          disabledDB: false,
          disabledShield: false,
          disabledParry: false,
          pace: 'creep',
          restrictedParry: false,
          higherGround: false,
          stunnedFoe: false,
          surprisedFoe: false,
          proneSource: false,
          proneTarget: false,
          offHand: attackName === 'offHand' ? true : false,
          ambush: false,
          chargeSpeed: 'none',
        },
        status: 'pending_attack_roll',
      } as ActionAttack;
      this.attacks!.push(attack);
    });
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
    if (!this.actionPoints) {
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
