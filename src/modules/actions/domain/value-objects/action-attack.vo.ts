import { ActionAttackCalculated } from './action-attack-calculated.vo.js';
import { ActionAttackModifiers, type AttackType, type ProtectPosition } from './action-attack-modifiers.vo.js';
import { ActionAttackRoll } from './action-attack-roll.vo.js';
import type { AttackStatus } from './attack-status.vo.js';
import { CriticalEffect } from './critical-result.vo.js';
import { Critical } from './critical.vo.js';
import type { ShieldManeuver } from './shield-maneuver.vo.js';
import type { SeverityAdjustmentStep } from '../../../shared/domain/severity.js';
import type { DisarmResult } from '../services/special-maneuvers.js';

/**
 * Workspace spec 079, decision A7: how a disarm went (Table 9-7a). `total` is the disarm total read on the table and
 * `attackTotal` the total of the normal attack a partial success becomes (without the disarm modifiers). `unusual` flags
 * an unmodified 66, an unusual event the game master narrates.
 */
export interface ActionAttackDisarm {
  result: DisarmResult;
  total: number;
  attackTotal: number | null;
  unusual: boolean;
}

/** Workspace spec 079, decision A7: a subdual attack halved the hits and turned the critical into a subdual one (§9.7). */
export interface SubdualAdjustment {
  baseDamage: number;
  criticalType: string | null;
  criticalSeverity: string | null;
}

/** Workspace spec 076, decision B1: the reaction talent an attack comes from, and its fixed OB (null: the actor's). */
export interface ActionAttackReaction {
  traitId: string;
  triggerActionId: string;
  obOverride: number | null;
}

export class ActionAttack {
  /** Set when the attack of a reaction is prepared (workspace spec 076). */
  public reaction?: ActionAttackReaction | null;

  /** The Shield maneuver the defender rolls for this attack (workspace spec 077, decision A1.2). */
  public shieldManeuver?: ShieldManeuver | null;

  /** Result of a disarm on Table 9-7a, set by the attack roll (workspace spec 079, decision A7). */
  public disarm?: ActionAttackDisarm | null;

  constructor(
    public attackName: string,
    public type: AttackType,
    public modifiers: ActionAttackModifiers,
    public roll: ActionAttackRoll | undefined,
    public calculated: ActionAttackCalculated | undefined,
    public results: ActionAttackResult | undefined,
    public status: AttackStatus,
    public protectors: string[] | null,
    /** Position of each protector, by actor id (Table 9-7c); `other` when not given. */
    public protectorPositions?: Record<string, ProtectPosition>,
  ) {}

  //TODO make non static
  static isCalledShot(attack: ActionAttack): boolean {
    return attack.modifiers.calledShot !== undefined && attack.modifiers.calledShot !== 'none';
  }

  /**
   * What the attack is waiting for, derived from its rolls and results. Static because the attacks loaded from
   * Mongo are plain objects.
   */
  static calculateStatus(attack: ActionAttack): AttackStatus {
    if (attack.status === 'completed') {
      return 'completed';
    }
    if (!attack.roll?.roll) {
      return 'pending_attack_roll';
    }
    if (attack.results?.fumble && !attack.roll.fumbleRoll) {
      return 'pending_fumble_roll';
    }
    if (attack.results?.criticals?.some(critical => !critical.result)) {
      return 'pending_critical_roll';
    }
    return 'pending_apply';
  }
}

export class AttackTableEntry {
  constructor(
    public text: string,
    public damage: number,
    public criticalType: string | undefined,
    public criticalSeverity: string | undefined,
  ) {}
}

export class Fumble {
  constructor(
    public status: string,
    public text: string | undefined,
    public additionalDamageText: string | undefined,
    public damage: number | undefined,
    public effects: CriticalEffect[] | undefined,
  ) {}
}

/** The steps that move the critical severity live in shared/domain (workspace spec 077, decision D1). */
export type { SeverityAdjustmentKey, SeverityAdjustmentStep } from '../../../shared/domain/severity.js';

/** How the critical severity of the table changed: `final` null when the critical is not rolled. */
export interface SeverityAdjustment {
  original: string;
  final: string | null;
  steps: SeverityAdjustmentStep[];
}

/** The damage of the table before the Hit Multiplier of the attack size (Table 9-4a; spec 075, decision 2). */
export interface DamageAdjustment {
  baseDamage: number;
  multiplier: number;
}

export class ActionAttackResult {
  /** Set by the damage plugin when the attack size scales the damage (spec 075). */
  public damageAdjustment?: DamageAdjustment;
  /** Set by the attack size plugin when some step moves the critical severity (spec 075). */
  public severityAdjustment?: SeverityAdjustment;
  /** Set by the subdual plugin: the hits and critical of the table before the subdual (workspace spec 079). */
  public subdualAdjustment?: SubdualAdjustment;

  constructor(
    public attackTableEntry: AttackTableEntry | undefined,
    public criticals: Critical[] | undefined,
    public fumble: Fumble | undefined,
  ) {}
}
