import { ActionAttackCalculated } from './action-attack-calculated.vo.js';
import { ActionAttackModifiers, type AttackType, type ProtectPosition } from './action-attack-modifiers.vo.js';
import { ActionAttackRoll } from './action-attack-roll.vo.js';
import type { AttackStatus } from './attack-status.vo.js';
import { CriticalEffect } from './critical-result.vo.js';
import { Critical } from './critical.vo.js';

/** Workspace spec 076, decision B1: the reaction talent an attack comes from, and its fixed OB (null: the actor's). */
export interface ActionAttackReaction {
  traitId: string;
  triggerActionId: string;
  obOverride: number | null;
}

export class ActionAttack {
  /** Set when the attack of a reaction is prepared (workspace spec 076). */
  public reaction?: ActionAttackReaction | null;

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

/** Keys of the steps that move the critical severity (§9.4, T-3.1d, T-3.1e; workspace spec 075, decision 3). */
export type SeverityAdjustmentKey = 'attack-size' | 'charge' | 'fighting-style' | 'target-size' | 'light-boned' | 'critical-code';

export interface SeverityAdjustmentStep {
  key: SeverityAdjustmentKey;
  value: number;
}

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

  constructor(
    public attackTableEntry: AttackTableEntry | undefined,
    public criticals: Critical[] | undefined,
    public fumble: Fumble | undefined,
  ) {}
}
