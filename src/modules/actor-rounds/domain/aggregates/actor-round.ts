import { randomUUID } from 'crypto';
import type { AttackLocation } from '../../../actions/domain/value-objects/attack-location.vo.js';
import { BaseAggregateRoot } from '../../../shared/domain/aggregates/base-aggregate.js';
import { NotFoundError, UnprocessableEntityError, ValidationError } from '../../../shared/domain/errors/errors.js';
import { ActorRoundCreatedEvent } from '../events/actor-round.events.js';
import { ActorRoundAlert } from '../value-objects/actor-round-alert.vo.js';
import { ActorRoundAlertModifier } from '../value-objects/actor-round-alert-modifier.vo.js';
import { ActorRoundAttack } from '../value-objects/actor-round-attack.vo.js';
import { ActorRoundDefenseMode, type DefenseLevel } from '../value-objects/actor-round-defense-mode.vo.js';
import { ActorRoundDefense } from '../value-objects/actor-round-defense.vo.js';
import {
  ActorRoundEffect,
  ADRENAL_SPEED,
  AP_CAP,
  ARM_USELESS,
  ATTACK_PENALTY,
  BLEEDING,
  CANNOT_ATTACK,
  CANNOT_PARRY,
  DEAD,
  DISARMED,
  DISTRACTION,
  DYING,
  FEAR_EFFECTS,
  FEAR_NO_ATTACK_EFFECTS,
  FLATFOOTED,
  FRENZY,
  FRENZY_DYING,
  FRENZY_LEVELS,
  HALF_ACTIVITY,
  HALF_ACTIVITY_AP,
  HALF_MOVEMENT,
  INCAPACITATED,
  INITIATIVE_PENALTY,
  PARALYZED,
  HASTE,
  HOLD,
  MANUAL_AP,
  NON_VIOLENT,
  PENALTY,
  PRESSING_ADVANTAGE,
  REFLEXES,
  SPEED,
  STAGGERED,
  SURPRISED,
  UNCONSCIOUS,
} from '../value-objects/actor-round-effect.vo.js';
import { ActorRoundFatigue, MAX_FATIGUE_PENALTY } from '../value-objects/actor-round-fatigue.vo.js';
import { ActorRoundHP } from '../value-objects/actor-round-hp.vo.js';
import { ActorRoundInitiative } from '../value-objects/actor-round-initiative.vo.js';
import { ActorRoundMovement } from '../value-objects/actor-round-movement.vo.js';
import type { ActorRoundPenaltySource } from '../value-objects/actor-round-penalty-source.vo.js';
import { ActorRoundPenalty } from '../value-objects/actor-round-penalty.vo.js';
import { ActorRoundPhaseLog } from '../value-objects/actor-round-phase-log.vo.js';
import { ActorRoundShield } from '../value-objects/actor-round-shield.vo.js';
import { ActorRoundTrait, NATURAL_HASTE, STRIKE_REFLEX } from '../value-objects/actor-round-trait.vo.js';
import { ActorRoundUsedBo } from '../value-objects/actor-round-used-bo.vo.js';
import type { ActorType } from '../value-objects/actor-type.vo.js';
import { ApLedgerEntry, type ApLedgerKind } from '../value-objects/ap-ledger-entry.vo.js';
import { ApModifier, type ApModifierSource } from '../value-objects/ap-modifier.vo.js';
import type { HpChange, HpLogEntry } from '../value-objects/hp-log-entry.vo.js';
import { ACTION_PHASES, ActionPointCapacity } from '../services/action-point-capacity.js';
import { InjuryTreatmentRules, type MedicalOutcome, type TacticalProcedure, type TreatmentEffect } from '../services/injury-treatment.js';
import {
  buildInjury,
  deriveInjurySeverity,
  type Injury,
  type InjurySource,
  type InjuryTreatment,
  isBleeding,
  isPenalizing,
  toBodyLocation,
} from '../value-objects/injury.vo.js';
import type { ActorRoundProps, ActorRoundSnapshot } from './actor-round-props.js';
import type { ActorRoundResistance } from '../value-objects/actor-round-resistance.vo.js';
import {
  activeStyleAbility,
  type ActorRoundActiveStyle,
  type ActorRoundFightingStyle,
  OPTIONAL_STYLE_ABILITIES,
} from '../value-objects/actor-round-fighting-style.vo.js';

import { type ActorRoundItem, ActorRoundItems, type ItemModifier, UNARMORED_AT } from '../value-objects/actor-round-item.vo.js';
import { type BreakageModifier, BreakageResolver, type BreakageResult } from '../services/breakage-resolver.js';

/** Lightning Reflexes (workspace spec 032): initiative per time selected. */
const LIGHTNING_REFLEXES = 'lightning-reflexes';
const LIGHTNING_REFLEXES_BONUS = 5;
/** Raging Wind (workspace spec 040, decision 16): initiative when the round starts in frenzy. */
const RAGING_WIND = 'raging-wind';
const RAGING_WIND_BONUS = 5;

/** A breakage check of an item of the actor (spec 019, §2). */
export interface BreakageCheckInput {
  itemId: string;
  roll: number;
  unmodifiedRoll?: number;
  alertId?: string;
  /** The strength of the item when it has none, or the game master's one. */
  strength?: number;
  modifiers?: BreakageModifier[];
  tacticalGameName?: string;
  actionId?: string;
}

export interface BreakageCheckResult {
  itemId: string;
  roll: number;
  unmodified66: boolean;
  total: number;
  breakdown: BreakageModifier[];
  result: BreakageResult;
  /** The damage (or repair) added to the item; none on a success. */
  modifier?: ItemModifier;
}

/** Fields of an injury the game master can change (spec 013, §3). */
export type InjuryPatch = Partial<
  Pick<Injury, 'type' | 'severity' | 'location' | 'side' | 'penalty' | 'bleeding' | 'bleedingControl' | 'flags' | 'description' | 'status'>
>;

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

/** Phase number of the upkeep (see `Game.getEffectPhase`). */
const UPKEEP_PHASE = 5;

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

  /** Injuries of the actor (spec 013, §3): those it brought from its character and those taken in the game. */
  public injuries: Injury[] = [];

  /** Changes of the hits in this round, with their origin (spec 013, §1.1). Each round starts with none. */
  public hpLog: HpLogEntry[] = [];

  /** Strategic character of a character actor. */
  public characterId: string | undefined;

  /** Items of the actor (spec 019): those of its character, or the attacks and shield of an NPC. */
  public items: ActorRoundItem[] = [];

  /** Resistance roll bonuses of its character (workspace spec 022): none for NPCs. */
  public resistances: ActorRoundResistance[] = [];

  /** Fighting styles of its character (workspace spec 032): none for NPCs. */
  public fightingStyles: ActorRoundFightingStyle[] = [];

  /** The fighting style it fights with (workspace spec 032), kept from round to round. */
  public activeStyle: ActorRoundActiveStyle | null = null;

  /** The last breakage check (spec 019), for the answer of the check; not stored. */
  public lastBreakageCheck: BreakageCheckResult | undefined;

  /** The attack of the fumble whose effects are being added, for its breakage alert. */
  private fumbleAttackName: string | undefined;

  /** What the actor brought into the game (only in the actor round built from its character). */
  public snapshot: ActorRoundSnapshot | undefined;

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
      (props.alerts || []).map(alert => ActorRoundAlert.from(alert)),
      props.defenseMode ?? ActorRoundDefenseMode.none(),
      props.phaseLog ?? [],
      ActorRound.readLedger(props),
      props.traits ?? [],
      props.imageUrl,
      props.owner,
      props.createdAt,
      props.updatedAt,
    );
    actorRound.injuries = (props.injuries ?? []).map(injury => ({ ...injury, treatments: [...(injury.treatments ?? [])] }));
    actorRound.hpLog = (props.hpLog ?? []).map(entry => ({ ...entry }));
    actorRound.characterId = props.characterId ?? (props.actorType === 'character' ? props.actorId : undefined);
    actorRound.items = (props.items ?? []).map(item => ActorRoundItems.copy(item));
    actorRound.snapshot = props.snapshot;
    actorRound.resistances = (props.resistances ?? []).map(resistance => ({ ...resistance }));
    actorRound.fightingStyles = (props.fightingStyles ?? []).map(style => ActorRound.copyStyle(style));
    actorRound.activeStyle = props.activeStyle ? ActorRound.copyActiveStyle(props.activeStyle) : null;
    actorRound.normalizeLegacy();
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
    actorRound.injuries = previous.injuries.map(injury => ({ ...injury, treatments: [...injury.treatments] }));
    actorRound.characterId = previous.characterId;
    actorRound.items = previous.items.map(item => ActorRoundItems.copy(item));
    actorRound.resistances = previous.resistances.map(resistance => ({ ...resistance }));
    actorRound.fightingStyles = previous.fightingStyles.map(style => ActorRound.copyStyle(style));
    // The style is kept until the player changes it; the optional abilities are declared each round.
    actorRound.activeStyle = previous.activeStyle ? { ...ActorRound.copyActiveStyle(previous.activeStyle), options: [] } : null;
    actorRound.applyItemConditions();
    actorRound.calculateCurrentBo();
    actorRound.applyPenalties();
    actorRound.apply(new ActorRoundCreatedEvent(actorRound));
    return actorRound;
  }

  /**
   * Round 1 of a character (spec 013, §3): its injuries not healed (same uuid), its unresolved conditions as effects
   * and what it brought into the game.
   */
  initFromCharacter(characterId: string, injuries: Injury[], conditionEffects: ActorRoundEffect[], snapshot: ActorRoundSnapshot): void {
    this.characterId = characterId;
    this.injuries = injuries.map(injury => ({ ...injury, treatments: [...(injury.treatments ?? [])] }));
    conditionEffects.forEach(effect => this.addEffect(effect, undefined));
    this.snapshot = snapshot;
    this.applyPenalties();
    this.refreshActionPoints();
  }

  /**
   * Actor rounds stored before spec 013 (and not migrated): `unconcious` is `unconscious`, and the bleeding effects and
   * critical penalties are injuries of unknown type (with the id of the effect or modifier, so it is stable).
   */
  private normalizeLegacy(): void {
    const legacyStatus = 'unconcious';
    this.effects = (this.effects ?? []).map(effect => (effect.status === legacyStatus ? { ...effect, status: UNCONSCIOUS } : effect));
    const createdAt = this.createdAt ? new Date(this.createdAt) : new Date();
    const source: InjurySource = { kind: 'manual', tacticalGameId: this.gameId, round: this.round };
    this.effects
      .filter(effect => effect.status === BLEEDING)
      .forEach(effect =>
        this.injuries.push(buildInjury({ id: effect.id, type: 'unknown', penalty: 0, bleeding: effect.value ?? 0, source, createdAt })),
      );
    this.effects = this.effects.filter(effect => effect.status !== BLEEDING);
    this.penalty.modifiers
      .filter(modifier => modifier.source === 'critical')
      .forEach(modifier =>
        this.injuries.push(buildInjury({ id: modifier.id, type: 'unknown', penalty: modifier.value, source, createdAt })),
      );
    this.penalty.modifiers = this.penalty.modifiers.filter(modifier => modifier.source !== 'critical');
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
   * round in every upkeep. `hpChanges` say where the hits come from (spec 013, §1.1): the hits they do not account for
   * are logged as a game master adjustment.
   */
  applyAttackResults(
    dmg: number | undefined,
    effects: ActorRoundEffect[] | undefined,
    location: AttackLocation | undefined,
    application?: EffectApplication,
    injuries: Injury[] = [],
    hpChanges: HpChange[] = [],
    /** The attack of a fumble, whose item takes its breakage roll (spec 019, decision 6). */
    fumbleAttackName?: string,
  ) {
    this.fumbleAttackName = fumbleAttackName;
    if (dmg) {
      this.hp.current -= dmg;
      this.logDamage(dmg, hpChanges, application?.phase);
    }
    injuries.forEach(injury => this.addInjury(injury));
    if (effects) {
      effects.forEach(effect => {
        if (application) {
          effect.appliedRound = this.round;
          effect.appliedPhase = application.phase;
          effect.spentApBefore = application.spentAp;
        }
        this.addEffect(effect, location);
      });
    }
    this.checkHitsState();
    this.applyPenalties();
    this.refreshActionPoints();
  }

  /**
   * Dead beyond the death threshold, unconscious at 0 or fewer hits. In frenzy (workspace spec 040, decision 14) the
   * actor fights on below 0 hits: it falls unconscious at the threshold, the frenzy ends, and beyond it it is dying in
   * frenzy instead of dead. A frenzy-dying actor does not die from its hits, only from a failed physical RR.
   */
  private checkHitsState(): void {
    if (this.hasEffect(FRENZY)) {
      if (!this.isAtDeathThreshold()) {
        return;
      }
      if (this.isBeyondDeathThreshold()) {
        this.addEffect(new ActorRoundEffect(randomUUID(), FRENZY_DYING, undefined, undefined), undefined);
      }
      this.addEffect(new ActorRoundEffect(randomUUID(), UNCONSCIOUS, undefined, undefined), undefined);
      return;
    }
    if (this.hasEffect(FRENZY_DYING)) {
      this.endFrenzyDyingWhenHealed();
      return;
    }
    if (this.isBeyondDeathThreshold()) {
      this.addEffect(new ActorRoundEffect(randomUUID(), DEAD, undefined, undefined), undefined);
    } else if (this.hp.current < 1) {
      this.addEffect(new ActorRoundEffect(randomUUID(), UNCONSCIOUS, undefined, undefined), undefined);
    }
  }

  /**
   * Game master hits adjustment (`PATCH hp`): `dmg` hits taken (negative heals). The hits never go over the maximum,
   * and an actor brought over 0 hits wakes from the unconsciousness its hits caused (spec 013, §9.7).
   */
  adjustHp(dmg: number, phase?: number): void {
    if (dmg > 0) {
      this.applyAttackResults(dmg, undefined, undefined, undefined, [], [{ kind: 'manual', amount: -dmg, phase }]);
      return;
    }
    this.heal(-dmg, { kind: 'manual', phase });
  }

  /**
   * Heals `hits`, up to the maximum, logged with `origin` (the hits the maximum let in). Over 0 hits, the
   * unconsciousness caused by the hits ends.
   */
  heal(hits: number, origin: Omit<HpChange, 'amount'> = { kind: 'manual' }): void {
    if (hits > 0) {
      const before = this.hp.current;
      this.hp.current = Math.min(this.hp.max, this.hp.current + hits);
      this.logHp({ ...origin, amount: this.hp.current - before });
    }
    this.endFrenzyDyingWhenHealed();
    if (this.hp.current > 0) {
      this.effects = this.effects.filter(effect => effect.status !== UNCONSCIOUS || ActorRound.isFromCritical(effect));
    }
    this.applyPenalties();
    this.refreshActionPoints();
  }

  /** Logs `dmg` hits taken by their origins; what they do not account for is a game master adjustment. */
  private logDamage(dmg: number, changes: HpChange[], phase: number | undefined): void {
    const recorded = changes.filter(change => change.amount !== 0);
    const rest = -dmg - recorded.reduce((sum, change) => sum + change.amount, 0);
    if (rest !== 0) {
      recorded.push({ kind: 'manual', amount: rest });
    }
    recorded.forEach(change => this.logHp({ ...change, phase: change.phase ?? phase }));
  }

  /** Adds a change of the hits to the log of the round (spec 013, §1.1); a change of 0 hits is not logged. */
  private logHp(change: HpChange): void {
    if (!change.amount) {
      return;
    }
    const defined = Object.fromEntries(Object.entries(change).filter(([, value]) => value !== undefined && value !== null)) as HpChange;
    this.hpLog.push({ ...defined, id: randomUUID(), round: this.round, at: new Date().toISOString() });
  }

  /**
   * An unconsciousness of a critical or a fumble does not end with the hits. The one of the hits, and the one brought
   * from a strategic condition (which also ends when the hits are over 0), do.
   */
  private static isFromCritical(effect: ActorRoundEffect): boolean {
    const kind = effect.source?.kind;
    return kind === 'critical' || kind === 'fumble';
  }

  // --- Injuries (spec 013, §3) ---

  addInjury(injury: Injury): void {
    if (this.injuries.some(existing => existing.id === injury.id)) {
      return;
    }
    this.injuries.push(injury);
  }

  findInjury(injuryId: string): Injury {
    const injury = this.injuries.find(each => each.id === injuryId);
    if (!injury) {
      throw new NotFoundError('Injury', injuryId, 'err-injury-not-found');
    }
    return injury;
  }

  /** Game master change of an injury. The severity follows the penalty and bleeding unless it is given. */
  updateInjury(injuryId: string, patch: InjuryPatch): Injury {
    const injury = this.findInjury(injuryId);
    const changed: InjuryPatch = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
    if (changed.penalty !== undefined) {
      changed.penalty = Math.min(0, changed.penalty);
    }
    if (changed.bleeding !== undefined) {
      changed.bleeding = Math.max(0, changed.bleeding);
    }
    Object.assign(injury, changed);
    if (patch.severity === undefined && (patch.penalty !== undefined || patch.bleeding !== undefined)) {
      injury.severity = deriveInjurySeverity(Math.min(injury.penalty, injury.initialPenalty), injury.bleeding);
    }
    if (patch.status === 'healed' && !injury.healedAt) {
      injury.healedAt = new Date().toISOString();
    }
    injury.updatedAt = new Date().toISOString();
    this.applyPenalties();
    return injury;
  }

  deleteInjury(injuryId: string): void {
    this.findInjury(injuryId);
    this.injuries = this.injuries.filter(injury => injury.id !== injuryId);
    this.applyPenalties();
  }

  /**
   * A medical procedure on one of the actor's injuries, already resolved with the medical maneuver table. The
   * treatment is kept in the injury. The heat critical and hits of a cauterization are left to the caller (see
   * `addHeatCriticalAlert`).
   */
  treatInjury(
    injuryId: string,
    procedure: TacticalProcedure,
    outcome: MedicalOutcome,
    treatment: Omit<InjuryTreatment, 'id' | 'procedure' | 'result' | 'healingType' | 'recoveryModifier' | 'at' | 'context'>,
    unmodifiedRoll?: number,
  ): { injury: Injury; effect: TreatmentEffect; treatment: InjuryTreatment } {
    const injury = this.findInjury(injuryId);
    InjuryTreatmentRules.validate(procedure, injury);
    const effect = InjuryTreatmentRules.apply(procedure, injury, outcome, unmodifiedRoll);
    const record: InjuryTreatment = {
      ...treatment,
      id: randomUUID(),
      procedure,
      result: outcome.result,
      healingType: effect.healingType,
      recoveryModifier: effect.recoveryModifier,
      at: new Date().toISOString(),
      context: 'tactical',
      tacticalGameId: this.gameId,
    };
    injury.treatments.push(record);
    injury.updatedAt = record.at;
    this.applyPenalties();
    return { injury, effect, treatment: record };
  }

  /** The heat critical of a cauterization for the game master to resolve, on the location of the injury (Table 13-1c). */
  addHeatCriticalAlert(severity: string, location: AttackLocation | undefined): ActorRoundAlert {
    const alert = ActorRoundAlert.buildCritical('H', severity, `Cauterization: ${severity} Heat critical`);
    if (location) {
      alert.modifiers?.push(new ActorRoundAlertModifier('location', null, location));
    }
    this.alerts.push(alert);
    return alert;
  }

  /** A dying actor stabilized (spec 013, §3): the dying effect gains the rounds of the result. */
  stabilize(effectId: string, rounds: number): ActorRoundEffect {
    const effect = this.effects.find(each => each.id === effectId);
    if (!effect) {
      throw new NotFoundError('Effect', effectId, 'err-effect-not-found');
    }
    if (effect.status !== DYING) {
      throw new ValidationError(`Effect ${effectId} is not a dying effect`, 'err-effect-not-dying');
    }
    if (rounds > 0) {
      effect.rounds = (effect.rounds ?? 0) + rounds;
    }
    return effect;
  }

  /** Bleeding of the actor's injuries, hits per round. */
  getBleeding(): number {
    return this.injuries.filter(isBleeding).reduce((sum, injury) => sum + (injury.bleeding ?? 0), 0);
  }

  /** At risk when the game ends (spec 013, §3): bleeding or dying, and not dead yet. */
  isAtRisk(): boolean {
    return !this.isDead() && (this.getBleeding() > 0 || this.hasEffect(DYING) || this.hasEffect(FRENZY_DYING));
  }

  /** §9.8 Hits: dead when the hits below zero exceed the Body Development bonus (`max` for older actor rounds). */
  private isBeyondDeathThreshold(): boolean {
    return this.hp.current < -this.deathThreshold();
  }

  /** Workspace spec 040: the frenzy ends when the hits below zero reach the Body Development bonus. */
  private isAtDeathThreshold(): boolean {
    return this.hp.current <= -this.deathThreshold();
  }

  private deathThreshold(): number {
    return this.hp.deathThreshold ?? this.hp.max;
  }

  /** Healed back to the death threshold, the frenzy-dying actor is no longer dying; it stays unconscious. */
  private endFrenzyDyingWhenHealed(): void {
    if (!this.isBeyondDeathThreshold() && this.effects.some(effect => effect.status === FRENZY_DYING)) {
      this.effects = this.effects.filter(effect => effect.status !== FRENZY_DYING);
      this.alerts.filter(alert => alert.type === 'frenzy-dying').forEach(alert => (alert.status = 'resolved'));
    }
  }

  /**
   * Physical RR of a frenzy-dying actor in the upkeep (workspace spec 040, decision 14): failed, it dies; resisted, it
   * stays dying until the next one.
   */
  resolveFrenzyDyingRr(resisted: boolean): void {
    if (!this.hasEffect(FRENZY_DYING)) {
      throw new UnprocessableEntityError('The actor is not dying in frenzy', 'err-frenzy-not-dying');
    }
    if (!resisted) {
      this.effects = this.effects.filter(effect => effect.status !== FRENZY_DYING);
      this.addEffect(new ActorRoundEffect(randomUUID(), DEAD, undefined, undefined), undefined);
    }
    this.alerts.filter(alert => alert.type === 'frenzy-dying').forEach(alert => (alert.status = 'resolved'));
    this.applyPenalties();
    this.refreshActionPoints();
  }

  /** The actor is in frenzy: 0 when not, 1 for Frenzy and 2 for Greater Frenzy (workspace spec 040). */
  frenzyLevel(): number {
    return this.activeEffects().find(effect => effect.status === FRENZY)?.value ?? 0;
  }

  private addEffect(effect: ActorRoundEffect, location: AttackLocation | undefined): void {
    // Penalties and bleeding are injuries (spec 013, §3): those not built from a critical are game master ones.
    if (effect.status === PENALTY || effect.status === BLEEDING) {
      if (!effect.value) throw new UnprocessableEntityError(`A ${effect.status} effect requires a value`, 'err-effect-invalid-value');
      this.addInjury(
        buildInjury({
          id: effect.id,
          type: 'unknown',
          location: toBodyLocation(location),
          penalty: effect.status === PENALTY ? effect.value : 0,
          bleeding: effect.status === BLEEDING ? effect.value : 0,
          source: effect.source ?? { kind: 'manual', tacticalGameId: this.gameId, round: this.round },
        }),
      );
      return;
    }
    if (effect.status === 'breakage_roll') {
      if (effect.source?.kind === 'fumble') {
        this.addFumbleBreakageAlert(this.fumbleAttackName, effect.value);
      } else {
        this.addCriticalBreakageAlert(location, effect.value);
      }
      return;
    }
    if (this.isDead() && effect.status === DYING) {
      return;
    }
    if (effect.status === FRENZY) {
      effect.value = effect.value ?? 1;
      effect.rounds = undefined;
      if (!FRENZY_LEVELS.includes(effect.value)) {
        throw new ValidationError('A frenzy effect takes the value 1 (frenzy) or 2 (greater frenzy)', 'err-effect-invalid-value');
      }
    }
    // Workspace spec 040, decision 14: falling unconscious (or dead) ends the frenzy.
    if (effect.status === UNCONSCIOUS || effect.status === DEAD) {
      this.effects = this.effects.filter(e => e.status !== FRENZY);
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
    // Non-Violent (workspace spec 039): one penalty for the rest of the combat, the most severe.
    if (effect.status === NON_VIOLENT) {
      const current = this.effects.find(e => e.status === NON_VIOLENT);
      if (current) {
        current.value = Math.min(current.value ?? 0, effect.value ?? 0);
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
      // Spec 034: a unique effect that applies now replaces the delayed ones (unconscious by hits before the hold).
      const pending = existing.filter(e => ActorRoundEffect.isPending(e, this.round));
      if (pending.length === existing.length && !ActorRoundEffect.isPending(effect, this.round)) {
        this.effects = this.effects.filter(e => !pending.includes(e));
        this.effects.push(effect);
      }
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
    const frenzy = this.effects.some(e => e.id === effectId && e.status === FRENZY);
    this.effects = this.effects.filter(e => e.id !== effectId);
    if (frenzy) {
      this.checkHitsState();
    }
    this.applyPenalties();
    this.refreshActionPoints();
  }

  /**
   * Workspace spec 040, decision 8: the actor enters frenzy (`level` 1) or greater frenzy (2), stamped with `application`
   * (the phase of the maneuver). Already in frenzy, the new level replaces the old one.
   */
  enterFrenzy(level: number, application?: EffectApplication): ActorRoundEffect {
    this.effects = this.effects.filter(e => e.status !== FRENZY);
    const effect = new ActorRoundEffect(randomUUID(), FRENZY, level, undefined, application ? this.round : undefined);
    if (application) {
      effect.appliedPhase = application.phase;
      effect.spentApBefore = application.spentAp;
    }
    this.addEffect(effect, undefined);
    this.applyPenalties();
    this.refreshActionPoints();
    return effect;
  }

  /** Leaves the frenzy: the hits penalty is back, and at 0 or fewer hits the actor falls unconscious. */
  leaveFrenzy(): void {
    const frenzy = this.effects.find(e => e.status === FRENZY);
    if (frenzy) {
      this.deleteEffect(frenzy.id);
    }
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
   * and `hits` are taken. Fatigue beyond -50 becomes an injury penalty (§5.5 Injuries due to Fatigue): an injury of
   * unknown type with a fatigue source, the one of this game made worse if there is one. The roll uses up the activity
   * points that called for it and its alert.
   */
  applyEnduranceResult(fatigueChange: number, hits: number, alertId?: string, gameName?: string, phase?: number): void {
    const fatigue = Math.max(0, (this.fatigue.fatigue || 0) + fatigueChange);
    const excess = Math.max(0, fatigue - MAX_FATIGUE_PENALTY);
    if (excess > 0) {
      this.addFatigueInjury(excess, gameName);
    }
    this.fatigue.fatigue = Math.min(fatigue, MAX_FATIGUE_PENALTY);
    this.fatigue.accumulator = Math.max(0, (this.fatigue.accumulator || 0) - 100);
    this.alerts = this.alerts.filter(alert => alert.id !== alertId);
    if (this.fatigue.accumulator < 100) {
      this.alerts = this.alerts.filter(alert => alert.type !== 'endurance');
    }
    // applyAttackResults checks unconsciousness and death, and recomputes the penalties (the fatigue one included).
    const taken = Math.max(0, hits);
    this.applyAttackResults(taken || undefined, undefined, undefined, undefined, [], [{ kind: 'endurance', amount: -taken, phase }]);
  }

  private addFatigueInjury(excess: number, gameName: string | undefined): void {
    const existing = this.injuries.find(
      injury => injury.source.kind === 'fatigue' && injury.source.tacticalGameId === this.gameId && injury.status === 'active',
    );
    if (existing) {
      existing.penalty -= excess;
      existing.initialPenalty = Math.min(existing.initialPenalty, existing.penalty);
      existing.severity = deriveInjurySeverity(existing.penalty, existing.bleeding);
      existing.updatedAt = new Date().toISOString();
      return;
    }
    this.addInjury(
      buildInjury({
        id: randomUUID(),
        type: 'unknown',
        penalty: -excess,
        source: { kind: 'fatigue', tacticalGameId: this.gameId, tacticalGameName: gameName, round: this.round },
      }),
    );
  }

  /**
   * §8.3 Upkeep Phase: bleeding, then the effects' durations. An unconscious actor stays unconscious: it only dies
   * when bleeding takes it beyond its death threshold or a dying effect runs out.
   */
  applyUpkeep() {
    const bleeding = this.getBleeding();
    if (this.effects.length === 0 && bleeding === 0) {
      return;
    }
    this.applyStaggeredUpkeep();
    // Spec 013, §3: the bleeding of the injuries, logged by injury (§1.1).
    this.hp.current -= bleeding;
    this.injuries
      .filter(injury => isBleeding(injury) && (injury.bleeding ?? 0) > 0)
      .forEach(injury =>
        this.logHp({
          kind: 'bleeding',
          amount: -(injury.bleeding ?? 0),
          phase: UPKEEP_PHASE,
          injuryId: injury.id,
          actionId: injury.source?.actionId,
          attackerId: injury.source?.attackerId,
          attackerName: injury.source?.attackerName,
          criticalKey: injury.source?.criticalKey,
        }),
      );
    this.getEffectsLosingARound().forEach(e => (e.rounds! -= 1));
    if (this.effects.some(e => e.status === DYING && e.rounds !== undefined && e.rounds !== null && e.rounds <= 0)) {
      this.addEffect(new ActorRoundEffect(randomUUID(), DEAD, undefined, undefined), undefined);
    }
    this.effects = this.effects.filter(e => e.rounds === undefined || e.rounds === null || e.rounds > 0);
    this.checkHitsState();
    if (this.isDead()) {
      this.effects = this.effects.filter(e => e.status !== DYING);
    }
    // Workspace spec 040, decision 14: a physical RR in every upkeep while dying in frenzy.
    if (this.hasEffect(FRENZY_DYING) && !this.alerts.some(alert => alert.type === 'frenzy-dying' && alert.status === 'pending')) {
      this.alerts.push(ActorRoundAlert.buildFrenzyDying());
    }
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

  /**
   * Effects whose duration goes down in this upkeep (§8.3 Upkeep): every timed effect except the stuns, of which only
   * the most severe loses a round (§9.8 Stun). An effect applied in this round only loses one if the actor had spent
   * fewer than 2 AP before it; applied later in the round, it keeps its rounds until the next upkeep. Surprise states
   * always end with their round.
   */
  private getEffectsLosingARound(): ActorRoundEffect[] {
    const timed = this.activeEffects().filter(e => e.rounds !== undefined && e.rounds !== null);
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
    this.applyInjuryPenalty();
    this.applyHpPenalty();
    this.applyStunPenalty();
    this.applyNonViolentPenalty();
    this.applyFatiguePenalty();
  }

  /** Spec 013, §3: the penalties of the injuries that still penalize, in full (no location rule). */
  private applyInjuryPenalty() {
    this.penalty.modifiers = this.penalty.modifiers.filter(m => m.source !== 'injury');
    const value = (this.injuries ?? []).filter(isPenalizing).reduce((sum, injury) => sum + Math.min(0, injury.penalty || 0), 0);
    if (value !== 0) {
      this.penalty.addModifier('injury', value);
    }
  }

  /** §5.5: the accumulated fatigue penalty applies to all actions. */
  private applyFatiguePenalty() {
    this.penalty.modifiers = this.penalty.modifiers.filter(m => m.source !== 'fatigue');
    const fatigue = Math.min(this.fatigue?.fatigue || 0, MAX_FATIGUE_PENALTY);
    if (fatigue > 0) {
      this.penalty.addModifier('fatigue', -fatigue);
    }
  }

  /**
   * Non-Violent no longer penalizes every action (workspace spec 039): only the attacks, through its combat plugin.
   * Actor rounds stored with the old penalty drop it.
   */
  private applyNonViolentPenalty() {
    this.penalty.modifiers = this.penalty.modifiers.filter(m => m.source !== NON_VIOLENT);
  }

  /** §9.8 Stun: the penalty of the most severe active stun, to every action. */
  private applyStunPenalty() {
    this.penalty.modifiers = this.penalty.modifiers.filter(m => m.source !== 'stunned');
    const stunPenalty = Math.min(0, this.getWorstStun()?.value ?? 0);
    if (stunPenalty !== 0) {
      this.penalty.addModifier('stunned', stunPenalty);
    }
  }

  /**
   * Table 9-8b: same thresholds by hits lost (over 25 %, 50 % and 75 %), penalties of -10, -20 and -30. None in frenzy
   * (workspace spec 040, decision 12).
   */
  private applyHpPenalty() {
    if (this.hasEffect(FRENZY)) {
      this.penalty.modifiers = this.penalty.modifiers.filter(m => m.source !== 'hp');
      return;
    }
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
      // Spec 019: the base OB counts the breakage the item brought; the one of the game is applied here.
      attack.currentBo = attack.baseBo + (attack.breakagePenalty || 0);
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
    if (this.isParryForbidden()) {
      return 0;
    }
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
    return this.effects.some(e => e.status === DEAD);
  }

  /** The actor has the effect, started (a delayed effect counts from its round, spec 034). */
  hasEffect(status: string): boolean {
    return this.activeEffects().some(e => e.status === status);
  }

  /** The effects that count this round: all but the delayed ones not started yet (spec 034). */
  activeEffects(): ActorRoundEffect[] {
    return (this.effects ?? []).filter(e => !ActorRoundEffect.isPending(e, this.round));
  }

  // --- Effects of the critical and fumble texts (workspace spec 034, phase 4) ---

  /** `cannot_attack`: the actor cannot declare attacks. */
  isAttackForbidden(): boolean {
    return this.hasEffect(CANNOT_ATTACK);
  }

  /** `cannot_parry`, a useless arm or frenzy (workspace spec 040, decision 13): the actor cannot parry nor protect. */
  isParryForbidden(): boolean {
    return this.hasEffect(CANNOT_PARRY) || this.hasEffect(ARM_USELESS) || this.hasEffect(FRENZY);
  }

  /** Disarmed or with a useless arm: the actor cannot attack with an item until the game master removes it. */
  isDisarmed(): boolean {
    return this.hasEffect(DISARMED) || this.hasEffect(ARM_USELESS);
  }

  /** Half movement rate. */
  hasHalfMovement(): boolean {
    return this.hasEffect(HALF_MOVEMENT);
  }

  /** Sum of the OB penalties of the `attack_penalty` effects (negative). */
  getAttackPenalty(): number {
    return this.activeEffects()
      .filter(e => e.status === ATTACK_PENALTY)
      .reduce((sum, e) => sum + Math.min(0, e.value ?? 0), 0);
  }

  /** Sum of the `initiative_penalty` effects (negative). */
  private getInitiativeEffectPenalty(): number {
    return this.activeEffects()
      .filter(e => e.status === INITIATIVE_PENALTY)
      .reduce((sum, e) => sum + Math.min(0, e.value ?? 0), 0);
  }

  /** Dead, dying, unconscious, incapacitated or paralyzed: the actor's open actions cannot go on (spec 011, §5). */
  isIncapacitated(): boolean {
    return this.isDead() || [DYING, UNCONSCIOUS, INCAPACITATED, PARALYZED].some(status => this.hasEffect(status));
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
    const penalty = (Math.trunc(this.getPenaltySum() / 10) || 0) + this.getInitiativeEffectPenalty();
    const strikeReflexBonus = strikeReflex ? STRIKE_REFLEX_BONUS : 0;
    const reflexesBonus = this.getReflexesInitiativeBonus();
    const styleBonus = this.getStyleInitiativeBonus();
    this.initiative.penalty = penalty;
    this.initiative.roll = roll;
    this.initiative.strikeReflex = strikeReflexBonus || undefined;
    this.initiative.reflexes = reflexesBonus || undefined;
    this.initiative.style = styleBonus || undefined;
    this.initiative.total = (this.initiative.base || 0) + penalty + strikeReflexBonus + reflexesBonus + styleBonus + roll;
  }

  // --- Fighting styles (workspace spec 032) ---

  /**
   * Lightning Reflexes: +5 initiative per time selected, when the round starts with suitable weapons. Raging Wind
   * (workspace spec 040, decision 16): +5 when the round starts in frenzy.
   */
  private getStyleInitiativeBonus(): number {
    const ability = activeStyleAbility(this.activeStyle, LIGHTNING_REFLEXES);
    const lightningReflexes = ability ? LIGHTNING_REFLEXES_BONUS * ability.times : 0;
    const ragingWind = this.startedInFrenzy() && activeStyleAbility(this.activeStyle, RAGING_WIND) ? RAGING_WIND_BONUS : 0;
    return lightningReflexes + ragingWind;
  }

  /** The frenzy comes from an earlier round (or was set by the game master before the round's actions). */
  private startedInFrenzy(): boolean {
    const frenzy = this.activeEffects().find(effect => effect.status === FRENZY);
    if (!frenzy) return false;
    return frenzy.appliedRound === undefined || frenzy.appliedRound === null || frenzy.appliedRound < this.round || !frenzy.appliedPhase;
  }

  /**
   * Sets the fighting style of the actor, or none, already evaluated against its equipment (only one per round). An
   * initiative already rolled is corrected with the new style bonus.
   */
  setActiveStyle(style: ActorRoundActiveStyle | null): void {
    if (style && !this.fightingStyles.some(each => each.skillId === style.skillId && each.styleId === style.styleId)) {
      throw new ValidationError(`The actor has no ranks in the fighting style ${style.styleId}`, 'err-fighting-style-not-known');
    }
    const invalid = (style?.options || []).find(
      option => !OPTIONAL_STYLE_ABILITIES.includes(option) || !style!.abilities.some(ability => ability.abilityId === option),
    );
    if (invalid) {
      throw new ValidationError(`The ability ${invalid} cannot be declared with the style`, 'err-fighting-style-option');
    }
    this.activeStyle = style;
    if (this.initiative.total !== undefined) {
      const previous = this.initiative.style || 0;
      const current = this.getStyleInitiativeBonus();
      this.initiative.style = current || undefined;
      this.initiative.total += current - previous;
    }
  }

  private static copyStyle(style: ActorRoundFightingStyle): ActorRoundFightingStyle {
    return { ...style, abilities: style.abilities.map(ability => ({ ...ability })) };
  }

  private static copyActiveStyle(style: ActorRoundActiveStyle): ActorRoundActiveStyle {
    return {
      ...style,
      attackNames: style.attackNames ? [...style.attackNames] : null,
      abilities: (style.abilities || []).map(ability => ({
        ...ability,
        attackNames: ability.attackNames ? [...ability.attackNames] : null,
      })),
      warnings: [...(style.warnings || [])],
      options: [...(style.options || [])],
    };
  }

  /** Initiative bonus of the strongest Reflexes effect. */
  private getReflexesInitiativeBonus(): number {
    return this.effects
      .filter(e => e.status === REFLEXES)
      .reduce((max, e) => Math.max(max, REFLEXES_INITIATIVE_BONUS[Math.min(3, Math.max(0, e.value ?? 0))] ?? 0), 0);
  }

  // --- Fear (workspace spec 022, decision 9) ---

  /** The fear effect of the actor (one at most), undefined when it is not afraid. */
  fearEffect(): ActorRoundEffect | undefined {
    return this.effects.find(effect => FEAR_EFFECTS.includes(effect.status));
  }

  /** Routed or broken: the actor cannot declare an attack. */
  isFearBlockingAttacks(): boolean {
    return this.effects.some(effect => FEAR_NO_ATTACK_EFFECTS.includes(effect.status));
  }

  /**
   * A failed fear RR (Table 14-3a): the actor takes the fear effect unless it already has a worse one (a failure
   * includes the milder ones). `value` is the failure margin. Answers the fear effect the actor ends with.
   */
  frighten(status: string, value: number, source?: InjurySource): ActorRoundEffect {
    if (!FEAR_EFFECTS.includes(status)) {
      throw new ValidationError(`Unknown fear effect ${status}`, 'err-effect-invalid-fear');
    }
    const current = this.fearEffect();
    if (current && FEAR_EFFECTS.indexOf(current.status) >= FEAR_EFFECTS.indexOf(status)) {
      return current;
    }
    this.effects = this.effects.filter(effect => !FEAR_EFFECTS.includes(effect.status));
    const effect = new ActorRoundEffect(randomUUID(), status, value, undefined, this.round, undefined, undefined, undefined, source);
    this.effects.push(effect);
    return effect;
  }

  /**
   * A rally (Table 14-3c): the fear changes by `steps` severities (negative calms it down; below the mildest it ends,
   * above the worst it stays the worst). An actor that is not afraid stays so. Answers the fear effect left.
   */
  changeFear(steps: number): ActorRoundEffect | undefined {
    const current = this.fearEffect();
    if (!current || !steps) {
      return current;
    }
    const index = FEAR_EFFECTS.indexOf(current.status) + steps;
    this.effects = this.effects.filter(effect => effect !== current);
    if (index < 0) {
      return undefined;
    }
    const status = FEAR_EFFECTS[Math.min(index, FEAR_EFFECTS.length - 1)];
    const effect = new ActorRoundEffect(
      current.id,
      status,
      current.value,
      undefined,
      current.appliedRound,
      undefined,
      undefined,
      undefined,
      current.source,
    );
    this.effects.push(effect);
    return effect;
  }

  /** Resistance roll bonus of a type, from the character sheet; undefined when the actor has none (NPCs). */
  resistanceBonus(resistance: string): number | undefined {
    return this.resistances.find(each => each.resistance === resistance)?.totalBonus;
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

  /** AP modifiers of the effects (spec 011, §1, initial sources) and of the talents. */
  private deriveApModifiers(): ApModifier[] {
    const modifiers: ApModifier[] = [];
    for (const effect of this.activeEffects()) {
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
        case HALF_ACTIVITY:
          modifiers.push(new ApModifier('half-activity', 'cap', HALF_ACTIVITY_AP, undefined, effect.id));
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
    // Workspace spec 040, decisions 1-2: Natural Haste adds its tier every round, on top of any other extra AP.
    const naturalHaste = ActorRoundTrait.tierOf(this.traits, NATURAL_HASTE);
    if (naturalHaste > 0) {
      modifiers.push(new ApModifier('natural-haste', 'bonus', naturalHaste));
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

  /** A 33 or 77 on the attack roll: the item of the attack (spec 019, decision 6). */
  addAttackBreakageAlert(attackName: string) {
    const itemId = this.attackItem(attackName)?.itemId;
    this.alerts.push(
      ActorRoundAlert.buildBreakage('attack-roll', { attackName, itemId, candidates: itemId ? [itemId] : this.usableItemIds() }),
    );
  }

  /**
   * The location of the critical comes with the effects (spec 013, §9.5); `chest` only when there is none. Its
   * candidates are the armor of the location, the shield and the weapons, the armor first (spec 019, decision 6).
   */
  addCriticalBreakageAlert(location: AttackLocation | undefined, penalty?: number) {
    const at = location || 'chest';
    const slot = ActorRoundItems.slotOf(at);
    const armor = (this.items ?? []).filter(item => item.kind === 'armor' && item.slot === slot);
    const shields = (this.items ?? []).filter(item => item.kind === 'shield' && item.slot === 'offHand');
    const weapons = (this.items ?? []).filter(item => item.kind === 'weapon' && (item.slot === 'mainHand' || item.slot === 'offHand'));
    const candidates = [...armor, ...shields, ...weapons].map(item => item.itemId);
    this.alerts.push(ActorRoundAlert.buildBreakage('critical', { location: at, penalty, itemId: candidates[0], candidates }));
  }

  /** A fumble breaks the item of the attack that fumbled. */
  /**
   * Spec 034: the game master is done with an alert handled by hand (the critical of a fumble). Endurance and breakage
   * alerts are resolved with their rolls.
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      throw new NotFoundError('Alert', alertId);
    }
    if (alert.type !== 'critical') {
      throw new ValidationError(`A ${alert.type} alert is resolved with its roll`, 'err-alert-not-resolvable');
    }
    alert.status = 'resolved';
  }

  /** Spec 034: the fumble gives the fumbler a critical of that severity, for the game master to roll. */
  addFumbleCriticalAlert(severity: string, attackName?: string): void {
    this.alerts.push(ActorRoundAlert.buildFumbleCritical(severity, attackName));
  }

  addFumbleBreakageAlert(attackName: string | undefined, penalty?: number) {
    const itemId = attackName ? this.attackItem(attackName)?.itemId : undefined;
    this.alerts.push(
      ActorRoundAlert.buildBreakage('fumble', { attackName, penalty, itemId, candidates: itemId ? [itemId] : this.usableItemIds() }),
    );
  }

  private attackItem(attackName: string): ActorRoundItem | undefined {
    const itemId = this.attacks.find(attack => attack.attackName === attackName)?.itemId;
    return itemId ? (this.items ?? []).find(item => item.itemId === itemId) : undefined;
  }

  /** Weapons and shields held, when the item of the alert is not known. */
  private usableItemIds(): string[] {
    return (this.items ?? []).filter(item => item.kind === 'weapon' || item.kind === 'shield').map(item => item.itemId);
  }

  /** Spec 019, §2: the items of the actor, when round 1 is built. */
  initItems(items: ActorRoundItem[]): void {
    this.items = items.map(item => ActorRoundItems.copy(item));
    this.applyItemConditions();
    this.calculateCurrentBo();
  }

  /**
   * Breakage check (§6.1, spec 019 decisions 4 and 5): the roll with the strength of the item, its quality, its earlier
   * damage, the penalty of the alert and the game master's modifiers, resolved on Table 6-1. The damage goes to the
   * item and from there to its attacks, the shield and the armor of its area.
   */
  resolveBreakageCheck(input: BreakageCheckInput): BreakageCheckResult {
    const item = (this.items ?? []).find(each => each.itemId === input.itemId);
    if (!item) {
      throw new NotFoundError('Item', input.itemId, 'err-breakage-item-not-found');
    }
    const alert = input.alertId ? this.alerts.find(each => each.id === input.alertId) : undefined;
    if (input.alertId && !alert) {
      throw new NotFoundError('Alert', input.alertId, 'err-alert-not-found');
    }
    if (alert && alert.status === 'resolved') {
      throw new ValidationError(`Alert ${alert.id} is already resolved`, 'err-alert-already-resolved');
    }
    const strength = input.strength ?? item.strength;
    if (typeof strength !== 'number' || !Number.isFinite(strength)) {
      throw new ValidationError(`Item ${item.name} has no strength`, 'err-breakage-strength-required');
    }
    const condition = ActorRoundItems.condition(item.modifiers);
    const breakdown: BreakageModifier[] = [
      { key: 'strength', value: strength },
      { key: 'quality', value: ActorRoundItems.breakageBonus(item) },
      { key: 'item-damage', value: condition.breakagePenalty },
      { key: 'origin', value: alert?.getModifierValue('penalty') ?? 0 },
      ...(input.modifiers || []).map(modifier => ({ key: modifier.key, value: modifier.value || 0 })),
    ].filter(modifier => modifier.key === 'strength' || modifier.value !== 0);
    const outcome = BreakageResolver.resolve(
      { roll: input.roll, unmodifiedRoll: input.unmodifiedRoll, modifiers: breakdown },
      condition.breakagePenalty,
    );
    let modifier: ItemModifier | undefined;
    if (outcome.damage !== 0 || outcome.broken) {
      modifier = {
        id: randomUUID(),
        type: 'breakage',
        value: outcome.damage,
        appliesTo: 'all',
        ...(outcome.broken ? { broken: true } : {}),
        ...(outcome.temporary ? { temporary: true } : {}),
        source: {
          kind: 'tactical',
          tacticalGameId: this.gameId,
          ...(input.tacticalGameName ? { tacticalGameName: input.tacticalGameName } : {}),
          round: this.round,
          ...(input.actionId ? { actionId: input.actionId } : {}),
        },
        createdAt: new Date().toISOString(),
      };
      item.modifiers.push(modifier);
    }
    if (alert) {
      alert.resolveBreakage(item.itemId, outcome.result, outcome.total);
    }
    this.applyItemConditions();
    this.calculateCurrentBo();
    this.lastBreakageCheck = {
      itemId: item.itemId,
      roll: input.roll,
      unmodified66: outcome.unmodified66,
      total: outcome.total,
      breakdown,
      result: outcome.result,
      ...(modifier ? { modifier } : {}),
    };
    return this.lastBreakageCheck;
  }

  /**
   * The breakage of the game on the attacks, the shield and the armor (spec 019, decisions 8-10). The base OB, the
   * shield DB and the ATs the actor brought count the damage its items brought; the one of the game is added here.
   */
  applyItemConditions(): void {
    this.attacks.forEach(attack => {
      const item = attack.itemId ? (this.items ?? []).find(each => each.itemId === attack.itemId) : undefined;
      const condition = item ? ActorRoundItems.gameCondition(item) : { breakagePenalty: 0, broken: false };
      attack.breakagePenalty = condition.breakagePenalty;
      attack.broken = condition.broken;
    });
    this.defense = this.defenseWithItems(this.defense);
  }

  private defenseWithItems(defense: ActorRoundDefense): ActorRoundDefense {
    let shield = defense.shield;
    const shieldItem = (this.items ?? []).find(item => item.kind === 'shield' && item.slot === 'offHand' && item.baseValue !== undefined);
    if (shieldItem && shield) {
      const condition = ActorRoundItems.gameCondition(shieldItem);
      shield = condition.broken
        ? null
        : new ActorRoundShield(Math.max(0, shieldItem.baseValue! + condition.breakagePenalty), shield.blockCount, shield.currentBlocks);
    }
    const armorAt = (slot: string, current: number | null): number | null => {
      const piece = (this.items ?? []).find(item => item.kind === 'armor' && item.slot === slot && item.baseValue !== undefined);
      if (!piece) return current;
      return ActorRoundItems.isUnprotected(ActorRoundItems.condition(piece.modifiers)) ? UNARMORED_AT : piece.baseValue!;
    };
    const headAt = armorAt('head', defense.headAt ?? defense.at);
    const bodyAt = armorAt('body', defense.bodyAt ?? defense.at);
    const armsAt = armorAt('arms', defense.armsAt ?? defense.at);
    const legsAt = armorAt('legs', defense.legsAt ?? defense.at);
    const uniform = headAt === bodyAt && bodyAt === armsAt && armsAt === legsAt;
    return new ActorRoundDefense(
      defense.bd,
      uniform ? headAt : null,
      uniform ? null : headAt,
      uniform ? null : bodyAt,
      uniform ? null : armsAt,
      uniform ? null : legsAt,
      shield,
      defense.protect,
    );
  }

  /** Spec 019, decision 10: the breakage armor took in the game, a maneuver penalty (the sheet counts the earlier one). */
  getArmorBreakagePenalty(): number {
    return this.items
      .filter(item => item.kind === 'armor')
      .reduce((sum, item) => sum + ActorRoundItems.gameCondition(item).breakagePenalty, 0);
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
      injuries: this.injuries,
      hpLog: this.hpLog,
      characterId: this.characterId,
      items: this.items,
      snapshot: this.snapshot,
      resistances: this.resistances,
      fightingStyles: this.fightingStyles,
      activeStyle: this.activeStyle,
      imageUrl: this.imageUrl,
      owner: this.owner,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
