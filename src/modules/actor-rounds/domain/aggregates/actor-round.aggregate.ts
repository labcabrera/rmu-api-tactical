import { randomUUID } from 'crypto';
import { AttackLocation } from '../../../actions/domain/value-objects/attack-location.vo';
import { BaseAggregateRoot } from '../../../shared/domain/aggregates/base-aggregate';
import { UnprocessableEntityError, ValidationError } from '../../../shared/domain/errors';
import { ActorRoundCreatedEvent } from '../events/actor-round.events';
import { ActorRoundAlert } from '../value-objets/actor-round-alert.vo';
import { ActorRoundAttack } from '../value-objets/actor-round-attack.vo';
import { ActorRoundDefenseMode, DefenseLevel } from '../value-objets/actor-round-defense-mode.vo';
import { ActorRoundDefense } from '../value-objets/actor-round-defense.vo';
import { ActorRoundEffect, NON_VIOLENT, PRESSING_ADVANTAGE } from '../value-objets/actor-round-effect.vo';
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
import { ActorRoundProps } from './actor-round-props';

/** When an effect lands: the phase (see `ActorRoundEffect.appliedPhase`) and the AP the actor had spent in the round. */
export interface EffectApplication {
  phase: number;
  spentAp: number;
}

/** Action points lost by a surprised actor when the effect has no value (§8.3 Surprise). */
const DEFAULT_SURPRISE_LOST_AP = 2;

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
    public traits: ActorRoundTrait[],
    public imageUrl: string | undefined,
    public owner: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date | null,
  ) {
    super(id);
  }

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
      4,
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
    if (effect.status === 'surprised') {
      this.normalizeSurprise(effect);
    }
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

  deleteEffect(effectId: string) {
    this.effects = this.effects.filter(e => e.id !== effectId);
    this.applyPenalties();
  }

  /** Removes the effects used up by an action, such as a `pressing-advantage` once its attack is applied. */
  consumeEffects(effectIds: string[]): void {
    if (effectIds.length === 0) {
      return;
    }
    this.effects = this.effects.filter(e => !effectIds.includes(e.id));
    this.applyPenalties();
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

  /**
   * §8.3 Initiative Phase: 2d10 plus the base, less 1 per -10 of the penalties to all actions, rounded toward zero
   * (-75 gives -7). A flatfooted actor does not roll initiative.
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
    this.initiative.penalty = penalty;
    this.initiative.roll = roll;
    this.initiative.strikeReflex = strikeReflexBonus || undefined;
    this.initiative.total = (this.initiative.base || 0) + penalty + strikeReflexBonus + roll;
  }

  /** Tier of one of the actor's traits, 0 when it does not have it. */
  traitTier(traitId: string): number {
    return ActorRoundTrait.tierOf(this.traits, traitId);
  }

  /**
   * Action points lost this round (§8.3 Surprise): all of them when flatfooted, the surprise effect's value (2, or 1
   * after a successful Perception) when surprised.
   */
  getLostActionPoints(): number {
    if (this.hasEffect('flatfooted')) {
      return this.actionPoints;
    }
    const surprised = this.effects.find(e => e.status === 'surprised');
    if (!surprised) {
      return 0;
    }
    return Math.min(this.actionPoints, surprised.value ?? DEFAULT_SURPRISE_LOST_AP);
  }

  /**
   * Action points spent in the round before `phase`, from the phase log, plus `spentInPhase` (the actions already
   * completed in that phase, which the log does not hold yet).
   */
  getSpentAp(phase: number, spentInPhase = 0): number {
    const logged = this.phaseLog.filter(entry => entry.phase < phase).reduce((sum, entry) => sum + entry.spentAp, 0);
    return logged + spentInPhase;
  }

  /** Records the action points spent in an action phase that ends, replacing an earlier entry of that phase. */
  logPhase(phase: number, spentAp: number): void {
    const totalSpentAp = this.getSpentAp(phase) + spentAp;
    this.phaseLog = this.phaseLog.filter(entry => entry.phase !== phase);
    this.phaseLog.push(new ActorRoundPhaseLog(phase, spentAp, totalSpentAp));
    this.phaseLog.sort((a, b) => a.phase - b.phase);
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
      traits: this.traits,
      imageUrl: this.imageUrl,
      owner: this.owner,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
