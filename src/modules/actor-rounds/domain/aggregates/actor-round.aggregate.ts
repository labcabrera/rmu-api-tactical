import { randomUUID } from 'crypto';
import { AttackLocation } from '../../../actions/domain/value-objects/attack-location.vo';
import { BaseAggregateRoot } from '../../../shared/domain/aggregates/base-aggregate';
import { UnprocessableEntityError, ValidationError } from '../../../shared/domain/errors';
import { ActorRoundCreatedEvent } from '../events/actor-round.events';
import { ActorRoundAlert } from '../value-objets/actor-round-alert.vo';
import { ActorRoundAttack } from '../value-objets/actor-round-attack.vo';
import { ActorRoundDefenseMode, DefenseLevel } from '../value-objets/actor-round-defense-mode.vo';
import { ActorRoundDefense } from '../value-objets/actor-round-defense.vo';
import {
  ActorRoundEffect,
  ADRENAL_SPEED,
  AP_CAP,
  DISTRACTION,
  FLATFOOTED,
  HASTE,
  HOLD,
  MANUAL_AP,
  NON_VIOLENT,
  PRESSING_ADVANTAGE,
  REFLEXES,
  SPEED,
  STAGGERED,
  SURPRISED,
} from '../value-objets/actor-round-effect.vo';
import { ActorRoundFatigue, MAX_FATIGUE_PENALTY } from '../value-objets/actor-round-fatigue.vo';
import { ActorRoundHP } from '../value-objets/actor-round-hp.vo';
import { ActorRoundInitiative } from '../value-objets/actor-round-initiative.vo';
import { ActorRoundMovement } from '../value-objets/actor-round-movement.vo';
import { ActorRoundPenaltySource } from '../value-objets/actor-round-penalty-source.vo';
import { ActorRoundPenalty } from '../value-objets/actor-round-penalty.vo';
import { ActorRoundPhaseLog } from '../value-objets/actor-round-phase-log.vo';
import { ActorRoundShield } from '../value-objets/actor-round-shield.vo';
import { ActorRoundTrait, STRIKE_REFLEX } from '../value-objets/actor-round-trait.vo';
import { ActorRoundUsedBo } from '../value-objets/actor-round-used-bo.vo';
import { ActorType } from '../value-objets/actor-type.vo';
import { ApLedgerEntry, ApLedgerKind } from '../value-objets/ap-ledger-entry.vo';
import { ApModifier, ApModifierSource } from '../value-objets/ap-modifier.vo';
import { ACTION_PHASES, ActionPointCapacity } from '../services/action-point-capacity';
import { ActorRoundProps } from './actor-round-props';

/** When an effect lands: the phase (see `ActorRoundEffect.appliedPhase`) and the AP the actor had spent in the round. */
export interface EffectApplication {
  phase: number;
  spentAp: number;
}

/** Action points lost by a surprised actor when the effect has no value (§8.3 Surprise). */
const DEFAULT_SURPRISE_LOST_AP = 2;

/** Action points of a round before any modifier: one per action phase (§8.3). */
export const BASE_ACTION_POINTS = 4;

/** AP lost by a staggered actor when the effect has no value. */
const DEFAULT_STAGGERED_LOST_AP = 1;

/** AP lost under Hold Kind when the effect has no value. */
const DEFAULT_HOLD_LOST_AP = 3;

/** Initiative bonus of the Reflexes effect by its value (1-3). */
const REFLEXES_INITIATIVE_BONUS: Record<number, number> = { 1: 10, 2: 15, 3: 20 };

/** Range of values of the AP effects that need one. */
const AP_EFFECT_VALUE_RANGES: Record<string, [number, number]> = {
  [HASTE]: [1, 4],
  [SPEED]: [1, 4],
  [REFLEXES]: [1, 3],
  [ADRENAL_SPEED]: [1, 4],
  [DISTRACTION]: [1, 3],
  [HOLD]: [1, BASE_ACTION_POINTS],
  [STAGGERED]: [1, BASE_ACTION_POINTS],
  [AP_CAP]: [0, BASE_ACTION_POINTS * 2],
};

/** An action as the AP ledger sees it, to rebuild the ledger of actor rounds stored without one. */
export interface LedgerSourceAction {
  id: string;
  phaseStart: number;
  phaseEnd: number | null;
  freeAction: boolean;
}

/** Initiative bonus of an actor with Strike Reflex when the game master declares it. */
const STRIKE_REFLEX_BONUS = 20;

export class ActorRound extends BaseAggregateRoot<ActorRoundProps> {
  private constructor(
    id: string,
    public readonly gameId: string,
    public readonly round: number,
    public readonly actorType: ActorType,
    public readonly actorId: string,
    public readonly actorName: string,
    public readonly size: number,
    public readonly raceName: string,
    public readonly level: number,
    public readonly factionId: string,
    public readonly movement: ActorRoundMovement,
    public readonly initiative: ActorRoundInitiative,
    public readonly actionPoints: number,
    public hp: ActorRoundHP,
    public fatigue: ActorRoundFatigue,
    public penalty: ActorRoundPenalty,
    public defense: ActorRoundDefense,
    public attacks: ActorRoundAttack[],
    public usedBo: ActorRoundUsedBo[],
    public parries: number[],
    public effects: ActorRoundEffect[],
    public alerts: ActorRoundAlert[],
    public defenseMode: ActorRoundDefenseMode,
    public phaseLog: ActorRoundPhaseLog[],
    /** AP spent, lost or used by instantaneous actions, by phase and action (spec 011, §2). */
    public apLedger: ApLedgerEntry[],
    public traits: ActorRoundTrait[],
    public imageUrl: string | undefined,
    public owner: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date | null,
  ) {
    super(id);
    this.refreshActionPoints();
  }

  /** Modifiers of the AP capacity, derived from the effects. */
  public apModifiers: ApModifier[] = [];

  /** AP of each action phase (index 0 is phase 1), derived from the modifiers and the ledger. */
  public apCapacity: number[] = [];

  /** AP of phase losses that found no capacity left in the round: they fall on phase 1 of the next one (§9.8). */
  public apPendingLoss = 0;

  /** The AP of `apPendingLoss` by the effect that left them. */
  private apPendingByEffect: Record<string, number> = {};

  static create(
    gameId: string,
    round: number,
    actorType: ActorType,
    actorId: string,
    actorName: string,
    size: number,
    raceName: string,
    level: number,
    factionId: string,
    movement: ActorRoundMovement,
    initiative: ActorRoundInitiative,
    actionPoints: number,
    hp: ActorRoundHP,
    fatigue: ActorRoundFatigue,
    penalty: ActorRoundPenalty,
    defense: ActorRoundDefense,
    attacks: ActorRoundAttack[],
    effects: ActorRoundEffect[],
    alerts: ActorRoundAlert[],
    imageUrl: string | undefined,
    owner: string,
    traits: ActorRoundTrait[] = [],
  ): ActorRound {
    const actorRound = new ActorRound(
      randomUUID(),
      gameId,
      round,
      actorType,
      actorId,
      actorName,
      size,
      raceName,
      level,
      factionId,
      movement,
      initiative,
      actionPoints,
      hp,
      fatigue,
      penalty,
      defense,
      attacks,
      [],
      [],
      effects,
      alerts,
      ActorRoundDefenseMode.none(),
      [],
      [],
      traits,
      imageUrl,
      owner,
      new Date(),
      null,
    );
    actorRound.calculateCurrentBo();
    actorRound.apply(new ActorRoundCreatedEvent(actorRound));
    return actorRound;
  }

  static empty(): ActorRound {
    return ActorRound.fromProps({
      id: randomUUID(),
      gameId: '',
      round: 0,
      actorType: 'character',
      actorId: '',
      actorName: '',
      size: 1,
      raceName: '',
      level: 0,
      factionId: '',
      movement: new ActorRoundMovement(0, 0, '', ''),
      initiative: new ActorRoundInitiative(0, 0, undefined, undefined),
      actionPoints: 0,
      hp: new ActorRoundHP(0, 0),
      fatigue: new ActorRoundFatigue(0, 0, 0),
      penalty: new ActorRoundPenalty([]),
      defense: new ActorRoundDefense(0, 0, 0, 0, 0, 0, null, 0),
      attacks: [],
      usedBo: [],
      parries: [],
      effects: [],
      alerts: [],
      imageUrl: undefined,
      owner: '',
      createdAt: new Date(),
      updatedAt: null,
    });
  }

  static fromProps(props: ActorRoundProps): ActorRound {
    const actorRound = new ActorRound(
      props.id,
      props.gameId,
      props.round,
      props.actorType,
      props.actorId,
      props.actorName,
      props.size,
      props.raceName,
      props.level,
      props.factionId,
      props.movement,
      props.initiative,
      props.actionPoints,
      props.hp,
      props.fatigue,
      props.penalty,
      props.defense,
      props.attacks,
      props.usedBo,
      props.parries,
      props.effects,
      props.alerts,
      props.defenseMode ?? ActorRoundDefenseMode.none(),
      props.phaseLog ?? [],
      ActorRound.readLedger(props),
      props.traits ?? [],
      props.imageUrl,
      props.owner,
      props.createdAt,
      props.updatedAt,
    );
    // Derived: recomputed so that values stored with the penalties folded in are corrected.
    actorRound.calculateCurrentBo();
    // Derived too: actor rounds stored with older hit point or stun penalties read with the current ones.
    actorRound.applyPenalties();
    return actorRound;
  }

  static createFromPrevious(previous: ActorRound): ActorRound {
    const {
      gameId,
      round,
      actorType,
      actorId,
      actorName,
      size,
      movement,
      raceName,
      level,
      factionId,
      initiative,
      hp,
      fatigue,
      penalty,
      defense,
      attacks,
      effects,
      alerts,
      traits,
      imageUrl,
      owner,
    } = previous;
    const actorRound = new ActorRound(
      randomUUID(),
      gameId,
      round + 1,
      actorType,
      actorId,
      actorName,
      size,
      raceName,
      level,
      factionId,
      movement,
      new ActorRoundInitiative(initiative.base, initiative.penalty, undefined, undefined),
      BASE_ACTION_POINTS,
      hp,
      fatigue,
      new ActorRoundPenalty([...penalty.modifiers]),
      ActorRound.resetShieldBlocks(defense),
      attacks,
      [],
      [],
      effects,
      alerts,
      ActorRoundDefenseMode.none(),
      [],
      [],
      traits,
      imageUrl,
      owner,
      new Date(),
      null,
    );
    actorRound.calculateCurrentBo();
    // A penalty that starts in the new round (non-violent) is counted from its first moment.
    actorRound.applyPenalties();
    actorRound.apply(new ActorRoundCreatedEvent(actorRound));
    return actorRound;
  }

  /**
   * The stored ledger. Actor rounds stored before the ledger existed get one rebuilt from their phase log: the AP of
   * each ended phase, without the action it went to.
   */
  private static readLedger(props: ActorRoundProps): ApLedgerEntry[] {
    if (props.apLedger && props.apLedger.length > 0) {
      return props.apLedger;
    }
    return (props.phaseLog ?? [])
      .filter(entry => entry.spentAp > 0)
      .map(entry => new ApLedgerEntry(entry.phase, undefined, entry.spentAp, 'spent'));
  }

  private static resetShieldBlocks(defense: ActorRoundDefense): ActorRoundDefense {
    if (!defense.shield) {
      return defense;
    }
    const shield = new ActorRoundShield(defense.shield.db, defense.shield.blockCount, 0);
    return new ActorRoundDefense(
      defense.bd,
      defense.at,
      defense.headAt,
      defense.bodyAt,
      defense.armsAt,
      defense.legsAt,
      shield,
      defense.protect,
    );
  }

  /**
   * Applies the hits and the effects of an attack (or of the game master). `application` stamps the effects with the
   * round, phase and AP spent, which decide whether the upkeep of this round shortens them; without it they lose a
   * round in every upkeep.
   */
  applyAttackResults(
    dmg: number | undefined,
    effects: ActorRoundEffect[] | undefined,
    location: AttackLocation | undefined,
    application?: EffectApplication,
  ) {
    if (dmg) {
      this.hp.current -= dmg;
    }
    if (effects) {
      effects.forEach(effect => {
        if (application) {
          effect.appliedRound = this.round;
          effect.appliedPhase = application.phase;
          effect.spentApBefore = application.spentAp;
        }
        this.addEffect(effect, 'critical', location);
      });
    }
    if (this.isBeyondDeathThreshold()) {
      this.addEffect(new ActorRoundEffect(randomUUID(), 'dead', undefined, undefined), undefined, undefined);
    } else if (this.hp.current < 1) {
      this.addEffect(new ActorRoundEffect(randomUUID(), 'unconcious', undefined, undefined), undefined, undefined);
    }
    this.applyPenalties();
    this.refreshActionPoints();
  }

  /** §9.8 Hits: dead when the hits below zero exceed the Body Development bonus (`max` for older actor rounds). */
  private isBeyondDeathThreshold(): boolean {
    const threshold = this.hp.deathThreshold ?? this.hp.max;
    return this.hp.current < -threshold;
  }

  private addEffect(
    effect: ActorRoundEffect,
    penaltySource: ActorRoundPenaltySource | undefined,
    location: AttackLocation | undefined,
  ): void {
    // Handle penalty effects separately
    if (effect.status === 'penalty') {
      if (!penaltySource) throw new UnprocessableEntityError('Penalty effects require a penalty source');
      if (!effect.value) throw new UnprocessableEntityError('Penalty effects require a value');
      this.penalty.addModifier(penaltySource, effect.value);
      return;
    }
    if (effect.status === 'breakage_roll') {
      this.addCriticalBreakageAlert(location);
      return;
    }
    if (this.isDead() && effect.status === 'dying') {
      return;
    }
    if (effect.status === SURPRISED) {
      this.normalizeSurprise(effect);
    }
    ActorRound.normalizeApEffect(effect);
    if (ActorRoundEffect.isRoundBound(effect)) {
      effect.rounds = 1;
    }
    // Only the last one counts: it is against the last foe hit.
    if (effect.status === PRESSING_ADVANTAGE) {
      this.effects = this.effects.filter(e => e.status !== PRESSING_ADVANTAGE);
    }
    // Several in the same round give one penalty, the most severe.
    if (effect.status === NON_VIOLENT) {
      const sameRound = this.effects.find(e => e.status === NON_VIOLENT && e.appliedRound === effect.appliedRound);
      if (sameRound) {
        sameRound.value = Math.min(sameRound.value ?? 0, effect.value ?? 0);
        return;
      }
    }
    // §9.8 Stun: stuns of the same severity add up their rounds. The merged one keeps the stamp of the first.
    if (effect.status === 'stunned') {
      const sameValue = this.effects.find(e => e.status === 'stunned' && e.value === effect.value);
      if (sameValue) {
        sameValue.rounds = (sameValue.rounds ?? 0) + (effect.rounds ?? 0);
        return;
      }
    }
    const existing = this.effects.filter(e => e.status === effect.status);
    const isUnique = ActorRoundEffect.isUnique(effect);
    if (isUnique && existing.length > 0) {
      return;
    }
    const isStackable = ActorRoundEffect.isStackable(effect);
    if (isStackable) {
      if (existing.length > 1) {
        throw new UnprocessableEntityError(`Multiple non-unique effects found: ${effect.status}`);
      } else if (existing.length === 1) {
        existing[0].value! += effect.value!;
        return;
      }
    }
    this.effects.push(effect);
  }

  private normalizeSurprise(effect: ActorRoundEffect): void {
    const lost = effect.value ?? DEFAULT_SURPRISE_LOST_AP;
    if (lost < 1 || lost > DEFAULT_SURPRISE_LOST_AP) {
      throw new ValidationError(`A surprised actor loses 1 or 2 action points, not ${lost}`);
    }
    effect.value = lost;
  }

  /** Checks the value of an AP effect, and sets the default one of those that have it. */
  private static normalizeApEffect(effect: ActorRoundEffect): void {
    if (effect.status === STAGGERED && (effect.value === undefined || effect.value === null)) {
      effect.value = DEFAULT_STAGGERED_LOST_AP;
    }
    if (effect.status === HOLD && (effect.value === undefined || effect.value === null)) {
      effect.value = DEFAULT_HOLD_LOST_AP;
    }
    if (effect.status === MANUAL_AP) {
      if (!effect.value || !Number.isInteger(effect.value)) {
        throw new ValidationError('A manual AP effect needs a whole value other than 0', 'err-effect-invalid-value');
      }
      return;
    }
    const range = AP_EFFECT_VALUE_RANGES[effect.status];
    if (!range) {
      return;
    }
    const value = effect.value;
    if (value === undefined || value === null || !Number.isInteger(value) || value < range[0] || value > range[1]) {
      throw new ValidationError(`The ${effect.status} effect takes a value from ${range[0]} to ${range[1]}`, 'err-effect-invalid-value');
    }
  }

  deleteEffect(effectId: string) {
    this.effects = this.effects.filter(e => e.id !== effectId);
    this.applyPenalties();
    this.refreshActionPoints();
  }

  /** Removes the effects used up by an action, such as a `pressing-advantage` once its attack is applied. */
  consumeEffects(effectIds: string[]): void {
    if (effectIds.length === 0) {
      return;
    }
    this.effects = this.effects.filter(e => !effectIds.includes(e.id));
    this.applyPenalties();
    this.refreshActionPoints();
  }

  declareParry(parry: number): void {
    this.parries.push(parry);
    this.calculateCurrentBo();
  }

  addUsedBo(attackName: string, bo: number) {
    const attack = this.attacks.find(a => a.attackName === attackName);
    if (!attack) {
      throw new UnprocessableEntityError(`Attack not found: ${attackName}`);
    }
    const existing = this.usedBo.find(u => u.attackName === attackName);
    if (existing) {
      existing.usedBo += bo;
    } else {
      this.usedBo.push(new ActorRoundUsedBo(attackName, bo));
    }
    this.calculateCurrentBo();
  }

  addFatigue(fatigue: number) {
    this.fatigue.accumulator += fatigue;
    if (this.fatigue.accumulator >= 100) {
      if (this.alerts.find(a => a.type === 'endurance')) {
        return;
      }
      const alert = ActorRoundAlert.buildEndurance();
      this.alerts.push(alert);
    } else {
      this.alerts = this.alerts.filter(a => a.type !== 'endurance');
    }
  }

  /**
   * Applies an endurance roll (§5.5, Table 5-5): `fatigueChange` adds to the fatigue penalty (negative shakes it off)
   * and `hits` are taken. Fatigue beyond -50 becomes an injury, applied as hits lost. The roll uses up the activity
   * points that called for it and its alert.
   */
  applyEnduranceResult(fatigueChange: number, hits: number, alertId?: string): void {
    const fatigue = Math.max(0, (this.fatigue.fatigue || 0) + fatigueChange);
    const injury = Math.max(0, fatigue - MAX_FATIGUE_PENALTY);
    this.fatigue.fatigue = Math.min(fatigue, MAX_FATIGUE_PENALTY);
    this.fatigue.accumulator = Math.max(0, (this.fatigue.accumulator || 0) - 100);
    this.alerts = this.alerts.filter(alert => alert.id !== alertId);
    if (this.fatigue.accumulator < 100) {
      this.alerts = this.alerts.filter(alert => alert.type !== 'endurance');
    }
    // applyAttackResults checks unconsciousness and death, and recomputes the penalties (the fatigue one included).
    this.applyAttackResults(Math.max(0, hits) + injury || undefined, undefined, undefined);
  }

  /**
   * §8.3 Upkeep Phase: bleeding, then the effects' durations. An unconscious actor stays unconscious: it only dies
   * when bleeding takes it beyond its death threshold or a dying effect runs out.
   */
  applyUpkeep() {
    if (this.effects.length === 0) {
      return;
    }
    this.applyStaggeredUpkeep();
    const totalBleeding = this.effects.filter(e => e.status === 'bleeding').reduce((sum, e) => sum + (e.value ?? 0), 0);
    this.hp.current -= totalBleeding;
    this.getEffectsLosingARound().forEach(e => (e.rounds! -= 1));
    if (this.effects.some(e => e.status === 'dying' && e.rounds !== undefined && e.rounds !== null && e.rounds <= 0)) {
      this.addEffect(new ActorRoundEffect(randomUUID(), 'dead', undefined, undefined), undefined, undefined);
    }
    this.effects = this.effects.filter(e => e.rounds === undefined || e.rounds === null || e.rounds > 0);
    if (this.isBeyondDeathThreshold()) {
      this.addEffect(new ActorRoundEffect(randomUUID(), 'dead', undefined, undefined), undefined, undefined);
    }
    if (this.isDead()) {
      this.effects = this.effects.filter(e => e.status !== 'dying');
    }
    // A non-violent penalty lasts the round after the one it was gained in.
    this.effects = this.effects.filter(e => e.status !== NON_VIOLENT || !this.isFromEarlierRound(e));
    this.applyPenalties();
    this.refreshActionPoints();
  }

  /**
   * §8.3 and §9.8: the staggered effects of the round are applied by now, so they go. The AP they could not take in the
   * round (no capacity left) are lost in phase 1 of the next one: a staggered effect stamped with that round and phase
   * keeps them.
   */
  private applyStaggeredUpkeep(): void {
    this.refreshActionPoints();
    // A lasting loss that goes on in the next round takes its AP from phase 1 there anyway: its pending ones are not
    // carried twice.
    const pending = this.effects
      .filter(e => this.apPendingByEffect[e.id] && (e.status === STAGGERED || !this.outlivesUpkeep(e)))
      .reduce((sum, e) => sum + this.apPendingByEffect[e.id], 0);
    this.effects = this.effects.filter(e => e.status !== STAGGERED || this.isFromLaterRound(e));
    if (pending > 0) {
      this.effects.push(new ActorRoundEffect(randomUUID(), STAGGERED, pending, undefined, this.round + 1, 1, 0));
    }
  }

  /** The effect is still there after this upkeep: no duration, more than one round left, or applied late. */
  private outlivesUpkeep(effect: ActorRoundEffect): boolean {
    if (effect.rounds === undefined || effect.rounds === null) {
      return true;
    }
    return effect.rounds > 1 || (!ActorRoundEffect.isRoundBound(effect) && this.isAppliedThisRoundLate(effect));
  }

  private isFromLaterRound(effect: ActorRoundEffect): boolean {
    return effect.appliedRound !== undefined && effect.appliedRound !== null && effect.appliedRound > this.round;
  }

  private isFromEarlierRound(effect: ActorRoundEffect): boolean {
    return effect.appliedRound !== undefined && effect.appliedRound !== null && effect.appliedRound < this.round;
  }

  /**
   * Effects whose duration goes down in this upkeep (§8.3 Upkeep): every timed effect except the stuns, of which only
   * the most severe loses a round (§9.8 Stun). An effect applied in this round only loses one if the actor had spent
   * fewer than 2 AP before it; applied later in the round, it keeps its rounds until the next upkeep. Surprise states
   * always end with their round.
   */
  private getEffectsLosingARound(): ActorRoundEffect[] {
    const timed = this.effects.filter(e => e.rounds !== undefined && e.rounds !== null);
    const worstStun = this.getWorstStun();
    return timed
      .filter(e => e.status !== 'stunned' || e === worstStun)
      .filter(e => ActorRoundEffect.isRoundBound(e) || !this.isAppliedThisRoundLate(e));
  }

  private isAppliedThisRoundLate(effect: ActorRoundEffect): boolean {
    if (effect.appliedRound === undefined || effect.appliedRound === null) {
      return false;
    }
    return effect.appliedRound === this.round && (effect.spentApBefore ?? 0) >= 2;
  }

  /** The active stun with the highest penalty. */
  private getWorstStun(): ActorRoundEffect | undefined {
    return this.effects
      .filter(e => e.status === 'stunned')
      .reduce<ActorRoundEffect | undefined>((worst, e) => (!worst || (e.value ?? 0) < (worst.value ?? 0) ? e : worst), undefined);
  }

  private applyPenalties() {
    this.applyHpPenalty();
    this.applyStunPenalty();
    this.applyNonViolentPenalty();
    this.applyFatiguePenalty();
  }

  /** §5.5: the accumulated fatigue penalty applies to all actions. */
  private applyFatiguePenalty() {
    this.penalty.modifiers = this.penalty.modifiers.filter(m => m.source !== 'fatigue');
    const fatigue = Math.min(this.fatigue?.fatigue || 0, MAX_FATIGUE_PENALTY);
    if (fatigue > 0) {
      this.penalty.addModifier('fatigue', -fatigue);
    }
  }

  /** Non-violent: the penalty gained by inflicting a critical counts in the following round only. */
  private applyNonViolentPenalty() {
    this.penalty.modifiers = this.penalty.modifiers.filter(m => m.source !== NON_VIOLENT);
    const value = this.effects
      .filter(e => e.status === NON_VIOLENT && this.isFromEarlierRound(e))
      .reduce((sum, e) => sum + Math.min(0, e.value ?? 0), 0);
    if (value !== 0) {
      this.penalty.addModifier(NON_VIOLENT, value);
    }
  }

  /** §9.8 Stun: the penalty of the most severe active stun, to every action. */
  private applyStunPenalty() {
    this.penalty.modifiers = this.penalty.modifiers.filter(m => m.source !== 'stunned');
    const stunPenalty = Math.min(0, this.getWorstStun()?.value ?? 0);
    if (stunPenalty !== 0) {
      this.penalty.addModifier('stunned', stunPenalty);
    }
  }

  /** Table 9-8b: same thresholds by hits lost (over 25 %, 50 % and 75 %), penalties of -10, -20 and -30. */
  private applyHpPenalty() {
    const hpPercent = this.hp.current / this.hp.max;
    let hpPenalty = 0;
    if (hpPercent < 0.25) {
      hpPenalty = -30;
    } else if (hpPercent < 0.5) {
      hpPenalty = -20;
    } else if (hpPercent < 0.75) {
      hpPenalty = -10;
    }
    this.penalty.modifiers = this.penalty.modifiers.filter(m => m.source !== 'hp');
    if (hpPenalty !== 0) {
      this.penalty.addModifier('hp', hpPenalty);
    }
  }

  /**
   * OB left to spend this round: the base OB less the OB already used in attacks and parries. Penalties are not
   * in it; the combat plugins apply them to the roll, and they cap the parry (`getAvailableParry`).
   */
  private calculateCurrentBo() {
    this.attacks.forEach(attack => {
      attack.currentBo = attack.baseBo;
      this.usedBo.forEach(u => (attack.currentBo -= u.usedBo));
      this.parries.forEach(p => (attack.currentBo -= p));
    });
  }

  /** Sum of the penalties (negative). */
  getPenaltySum(): number {
    return this.penalty.modifiers.reduce((sum, m) => sum + m.value, 0);
  }

  /** Penalties by source, the zero ones left out. */
  getPenaltiesBySource(): Array<{ source: ActorRoundPenaltySource; value: number }> {
    const bySource = new Map<ActorRoundPenaltySource, number>();
    this.penalty.modifiers.forEach(m => bySource.set(m.source, (bySource.get(m.source) || 0) + m.value));
    return [...bySource.entries()].filter(([, value]) => value !== 0).map(([source, value]) => ({ source, value }));
  }

  /** Most it can parry with its melee attacks: the OB left, with the penalties applied. */
  getAvailableParry(): number {
    const penalty = this.getPenaltySum();
    return this.attacks
      .filter(a => a.type === 'melee')
      .map(a => a.currentBo + penalty)
      .reduce((max, value) => Math.max(max, value), 0);
  }

  getCurrentBo(attackName: string): number {
    const attack = this.attacks.find(a => a.attackName === attackName);
    if (!attack) {
      throw new UnprocessableEntityError(`Attack not found: ${attackName}`);
    }
    return attack.currentBo;
  }

  isDead(): boolean {
    return this.effects.some(e => e.status === 'dead');
  }

  hasEffect(status: string): boolean {
    return this.effects.some(e => e.status === status);
  }

  /** Dead, dying or unconscious (both spellings of the effect): the actor's open actions cannot go on (spec 011, §5). */
  isIncapacitated(): boolean {
    return this.isDead() || this.hasEffect('dying') || this.hasEffect('unconcious') || this.hasEffect('unconscious');
  }

  /** The actor can carry on an action: it is not incapacitated and has some AP this round (spec 011, §5). */
  canAct(): boolean {
    return !this.isIncapacitated() && this.totalCapacity() > 0;
  }

  /**
   * §8.3 Initiative Phase: 2d10 plus the base, less 1 per -10 of the penalties to all actions, rounded toward zero
   * (-75 gives -7). A flatfooted actor does not roll initiative. The Reflexes effect adds +10, +15 or +20 (value 1-3).
   */
  declareInitiative(roll: number, strikeReflex = false): void {
    if (this.hasEffect('flatfooted')) {
      throw new ValidationError('A flatfooted actor does not roll initiative');
    }
    if (strikeReflex && ActorRoundTrait.tierOf(this.traits, STRIKE_REFLEX) === 0) {
      throw new ValidationError('The actor has not the Strike Reflex talent', 'err-strike-reflex-without-trait');
    }
    const penalty = Math.trunc(this.getPenaltySum() / 10) || 0;
    const strikeReflexBonus = strikeReflex ? STRIKE_REFLEX_BONUS : 0;
    const reflexesBonus = this.getReflexesInitiativeBonus();
    this.initiative.penalty = penalty;
    this.initiative.roll = roll;
    this.initiative.strikeReflex = strikeReflexBonus || undefined;
    this.initiative.reflexes = reflexesBonus || undefined;
    this.initiative.total = (this.initiative.base || 0) + penalty + strikeReflexBonus + reflexesBonus + roll;
  }

  /** Initiative bonus of the strongest Reflexes effect. */
  private getReflexesInitiativeBonus(): number {
    return this.effects
      .filter(e => e.status === REFLEXES)
      .reduce((max, e) => Math.max(max, REFLEXES_INITIATIVE_BONUS[Math.min(3, Math.max(0, e.value ?? 0))] ?? 0), 0);
  }

  /** Tier of one of the actor's traits, 0 when it does not have it. */
  traitTier(traitId: string): number {
    return ActorRoundTrait.tierOf(this.traits, traitId);
  }

  /**
   * Action points spent in the round before `phase`, plus `spentInPhase` (the actions already completed in that
   * phase). From the ledger, or from the phase log while the actor round has no ledger.
   */
  getSpentAp(phase: number, spentInPhase = 0): number {
    const logged =
      this.apLedger.length > 0
        ? this.apLedger.filter(entry => entry.phase < phase && ApLedgerEntry.usesCapacity(entry)).reduce((sum, entry) => sum + entry.ap, 0)
        : this.phaseLog.filter(entry => entry.phase < phase).reduce((sum, entry) => sum + entry.spentAp, 0);
    return logged + spentInPhase;
  }

  /** Records the action points spent in an action phase that ends, replacing an earlier entry of that phase. */
  logPhase(phase: number, spentAp: number): void {
    const totalSpentAp = this.phaseLog.filter(entry => entry.phase < phase).reduce((sum, entry) => sum + entry.spentAp, 0) + spentAp;
    this.phaseLog = this.phaseLog.filter(entry => entry.phase !== phase);
    this.phaseLog.push(new ActorRoundPhaseLog(phase, spentAp, totalSpentAp));
    this.phaseLog.sort((a, b) => a.phase - b.phase);
  }

  /**
   * The phase log: the AP spent in each phase and up to it. Derived from the ledger when there is one (for every phase
   * up to the last one logged or with entries), else the stored one.
   */
  getPhaseLog(): ActorRoundPhaseLog[] {
    if (this.apLedger.length === 0) {
      return this.phaseLog;
    }
    const lastPhase = Math.max(...this.apLedger.map(entry => entry.phase), ...this.phaseLog.map(entry => entry.phase));
    const log: ActorRoundPhaseLog[] = [];
    let total = 0;
    for (let phase = 1; phase <= Math.min(lastPhase, ACTION_PHASES); phase++) {
      const spent = this.spentInPhase(phase);
      total += spent;
      log.push(new ActorRoundPhaseLog(phase, spent, total));
    }
    return log;
  }

  // --- Action points: capacity and ledger (spec 011, §1 and §2) ---

  /** AP of the round once every modifier is applied. */
  totalCapacity(): number {
    return this.apCapacity.reduce((sum, value) => sum + value, 0);
  }

  /** AP of a phase (1-4) once every modifier is applied. */
  capacityOf(phase: number): number {
    return this.apCapacity[phase - 1] ?? 0;
  }

  /** AP of a phase already used: spent on actions or on instantaneous actions past the first one. */
  spentInPhase(phase: number): number {
    return this.apLedger
      .filter(entry => entry.phase === phase && ApLedgerEntry.usesCapacity(entry))
      .reduce((sum, entry) => sum + entry.ap, 0);
  }

  /** AP of a phase not used yet (0 when the phase has none). */
  freeCapacity(phase: number): number {
    return Math.max(0, this.capacityOf(phase) - this.spentInPhase(phase));
  }

  /** AP an action spent (lost entries left out). */
  spentByAction(actionId: string): number {
    return this.apLedger
      .filter(entry => entry.actionId === actionId && ApLedgerEntry.usesCapacity(entry))
      .reduce((sum, entry) => sum + entry.ap, 0);
  }

  /** Ledger entries of an action, lost ones included, in phase order. */
  ledgerOf(actionId: string): ApLedgerEntry[] {
    return this.apLedger.filter(entry => entry.actionId === actionId).sort((a, b) => a.phase - b.phase);
  }

  /** AP used in the round. */
  totalSpent(): number {
    return this.apLedger.filter(entry => ApLedgerEntry.usesCapacity(entry)).reduce((sum, entry) => sum + entry.ap, 0);
  }

  /** AP of the round not used yet, from `fromPhase` on. */
  remainingCapacity(fromPhase = 1): number {
    let remaining = 0;
    for (let phase = Math.max(1, fromPhase); phase <= ACTION_PHASES; phase++) {
      remaining += this.freeCapacity(phase);
    }
    return remaining;
  }

  /**
   * Records `ap` AP of `phase` on an action. A `spent` or `instant` entry needs that free capacity in the phase
   * (`err-action-points-exceeded`); a `lost` one records an AP an open action could not get, and uses none.
   */
  spend(phase: number, actionId: string | undefined, ap: number, kind: ApLedgerKind = 'spent'): ApLedgerEntry {
    if (!Number.isInteger(phase) || phase < 1 || phase > ACTION_PHASES) {
      throw new ValidationError(`Action points are spent in a phase from 1 to ${ACTION_PHASES}`, 'err-action-invalid-phase');
    }
    if (!Number.isInteger(ap) || ap < 0) {
      throw new ValidationError('Action points spent must be a whole number from 0', 'err-action-points-invalid');
    }
    const entry = new ApLedgerEntry(phase, actionId, ap, kind);
    if (ApLedgerEntry.usesCapacity(entry) && ap > this.freeCapacity(phase)) {
      throw new ValidationError(`The actor has no action points left in phase ${phase}`, 'err-action-points-exceeded');
    }
    this.apLedger.push(entry);
    this.refreshActionPoints();
    return entry;
  }

  /** Removes the ledger entries of a deleted action: the AP it took are free again. */
  releaseAction(actionId: string): boolean {
    const before = this.apLedger.length;
    this.apLedger = this.apLedger.filter(entry => entry.actionId !== actionId);
    if (this.apLedger.length === before) {
      return false;
    }
    this.refreshActionPoints();
    return true;
  }

  /**
   * Fills the ledger from the actions of the round, as AP were counted before it existed: 1 AP per phase an action
   * spans (an action still open spans up to `upToPhase`), whatever the number of actions, and an `instant` 0 AP entry
   * for each instantaneous action. Phases that already have AP used or lost are left as they are, so it can run again.
   */
  fillLedgerFromActions(actions: LedgerSourceAction[], upToPhase: number): void {
    const lastPhase = Math.min(upToPhase, ACTION_PHASES);
    const sorted = [...actions].sort((a, b) => a.phaseStart - b.phaseStart);
    sorted
      .filter(action => action.freeAction && action.phaseStart <= lastPhase && !this.apLedger.some(entry => entry.actionId === action.id))
      .forEach(action => this.apLedger.push(new ApLedgerEntry(action.phaseStart, action.id, 0, 'instant')));
    for (let phase = 1; phase <= lastPhase; phase++) {
      const recorded = this.apLedger.some(entry => entry.phase === phase && (entry.kind === 'lost' || entry.ap > 0));
      if (recorded) {
        continue;
      }
      const spanning = sorted.find(action => !action.freeAction && action.phaseStart <= phase && (action.phaseEnd ?? lastPhase) >= phase);
      if (spanning) {
        this.apLedger.push(new ApLedgerEntry(phase, spanning.id, 1, 'spent'));
      }
    }
    this.refreshActionPoints();
  }

  /** Recomputes the AP modifiers from the effects, and the capacity of each phase from them and the ledger. */
  private refreshActionPoints(): void {
    this.apModifiers = this.deriveApModifiers();
    const spent = Array.from({ length: ACTION_PHASES }, (_, i) => this.spentInPhase(i + 1));
    const result = ActionPointCapacity.compute(this.apModifiers, { spent });
    this.apCapacity = result.capacity;
    this.apPendingLoss = result.pendingLoss;
    this.apPendingByEffect = result.pendingByEffect;
  }

  /** AP modifiers of the effects (spec 011, §1, initial sources). */
  private deriveApModifiers(): ApModifier[] {
    const modifiers: ApModifier[] = [];
    for (const effect of this.effects ?? []) {
      const value = effect.value ?? 0;
      switch (effect.status) {
        case SURPRISED:
          modifiers.push(new ApModifier('surprised', 'loss', effect.value ?? DEFAULT_SURPRISE_LOST_AP, undefined, effect.id));
          break;
        case FLATFOOTED:
          modifiers.push(new ApModifier('flatfooted', 'cap', 0, undefined, effect.id));
          break;
        case STAGGERED:
          if (!this.isFromLaterRound(effect)) {
            modifiers.push(
              new ApModifier('staggered', 'loss', effect.value ?? DEFAULT_STAGGERED_LOST_AP, this.staggeredPhase(effect), effect.id),
            );
          }
          break;
        case HASTE:
        case SPEED:
        case REFLEXES:
          modifiers.push(new ApModifier(effect.status, 'bonus', value, undefined, effect.id));
          break;
        case ADRENAL_SPEED:
          if (effect.appliedRound === undefined || effect.appliedRound === null || effect.appliedRound === this.round) {
            modifiers.push(new ApModifier('adrenal-speed', 'bonus', value, undefined, effect.id));
          }
          break;
        case HOLD:
          this.pushLoss(modifiers, 'hold', effect.value ?? DEFAULT_HOLD_LOST_AP, effect);
          break;
        case DISTRACTION:
          this.pushLoss(modifiers, 'distraction', value, effect);
          break;
        case AP_CAP:
          if (effect.value !== undefined && effect.value !== null) {
            modifiers.push(new ApModifier('cap', 'cap', effect.value, undefined, effect.id));
          }
          break;
        case MANUAL_AP:
          if (value > 0) {
            modifiers.push(new ApModifier('manual', 'bonus', value, undefined, effect.id));
          } else if (value < 0) {
            this.pushLoss(modifiers, 'manual', -value, effect);
          }
          break;
      }
    }
    return modifiers;
  }

  /**
   * A lasting loss (Hold Kind, distraction, manual): from phase 1 when the round starts with it, else from the phase
   * it was applied in onwards, leaving the phases before it and those already spent as they were. Applied in the
   * upkeep of this round, it only counts from the next one.
   */
  private pushLoss(modifiers: ApModifier[], source: ApModifierSource, value: number, effect: ActorRoundEffect): void {
    const appliedThisRound = effect.appliedRound !== undefined && effect.appliedRound !== null && effect.appliedRound === this.round;
    const phase = appliedThisRound ? (effect.appliedPhase ?? 0) : 0;
    if (phase > ACTION_PHASES) {
      return;
    }
    modifiers.push(new ApModifier(source, 'loss', value, phase >= 1 ? phase : undefined, effect.id));
  }

  /**
   * Phase a staggered effect takes its AP from: the one it was applied in (phase 1 when applied before the action
   * phases, in an earlier round or without a stamp). Applied in the upkeep (5), there is none left in the round.
   */
  private staggeredPhase(effect: ActorRoundEffect): number {
    if (effect.appliedRound !== undefined && effect.appliedRound !== null && effect.appliedRound < this.round) {
      return 1;
    }
    return Math.max(1, effect.appliedPhase ?? 1);
  }

  hasShieldBlocksLeft(): boolean {
    const shield = this.defense.shield;
    return !!shield && shield.currentBlocks < shield.blockCount;
  }

  /** Counts an attack blocked with the shield this round (§9.6 Shields). */
  useShieldBlock(): void {
    if (!this.defense.shield) {
      throw new UnprocessableEntityError('The actor has no shield');
    }
    if (!this.hasShieldBlocksLeft()) {
      throw new UnprocessableEntityError(`The shield already blocked ${this.defense.shield.blockCount} attacks this round`);
    }
    this.defense.shield.currentBlocks += 1;
  }

  /**
   * Declares the passive or partial dodge and block of the round; an undefined one is kept. A full one is only set by
   * `setFullDefense`.
   */
  setDefenseMode(dodge: DefenseLevel | undefined, block: DefenseLevel | undefined): void {
    const newDodge = dodge ?? this.defenseMode.dodge;
    const newBlock = block ?? this.defenseMode.block;
    if ((newDodge === 'full' && this.defenseMode.dodge !== 'full') || (newBlock === 'full' && this.defenseMode.block !== 'full')) {
      throw new ValidationError('A full dodge or block is declared with a 4 AP dodge action');
    }
    if (newBlock !== 'none' && !this.defense.shield) {
      throw new ValidationError('The actor has no shield to block with');
    }
    this.defenseMode = ActorRoundDefenseMode.of(newDodge, newBlock);
  }

  /** Full dodge or block (§9.6): the whole round spent on it, set when a 4 AP dodge action completes. */
  setFullDefense(defenseType: 'dodge' | 'block'): void {
    if (defenseType === 'block' && !this.defense.shield) {
      throw new ValidationError('The actor has no shield to block with');
    }
    this.defenseMode =
      defenseType === 'dodge'
        ? ActorRoundDefenseMode.of('full', this.defenseMode.block === 'full' ? 'none' : this.defenseMode.block)
        : ActorRoundDefenseMode.of(this.defenseMode.dodge === 'full' ? 'none' : this.defenseMode.dodge, 'full');
  }

  addAttackBreakageAlert(attackName: string) {
    this.alerts.push(ActorRoundAlert.buildBreakageFromAttack(attackName));
  }

  addCriticalBreakageAlert(location: AttackLocation | undefined) {
    //TODO required location
    this.alerts.push(ActorRoundAlert.buildBreakageFromCritical(location || 'chest'));
  }

  getProps(): ActorRoundProps {
    return {
      id: this.id,
      gameId: this.gameId,
      round: this.round,
      actorType: this.actorType,
      actorId: this.actorId,
      actorName: this.actorName,
      size: this.size,
      movement: this.movement,
      raceName: this.raceName,
      level: this.level,
      factionId: this.factionId,
      initiative: this.initiative,
      actionPoints: this.actionPoints,
      hp: this.hp,
      fatigue: this.fatigue,
      penalty: this.penalty,
      defense: this.defense,
      attacks: this.attacks,
      usedBo: this.usedBo,
      parries: this.parries,
      effects: this.effects,
      alerts: this.alerts,
      defenseMode: this.defenseMode,
      phaseLog: this.phaseLog,
      apModifiers: this.apModifiers,
      apCapacity: this.apCapacity,
      apLedger: this.apLedger,
      traits: this.traits,
      imageUrl: this.imageUrl,
      owner: this.owner,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
