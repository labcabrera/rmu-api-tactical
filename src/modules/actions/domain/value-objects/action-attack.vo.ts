import { ActionAttackCalculated } from './action-attack-calculated.vo.js';
import { ActionAttackModifiers, type AttackType, type ProtectPosition } from './action-attack-modifiers.vo.js';
import { ActionAttackRoll } from './action-attack-roll.vo.js';
import type { AttackStatus } from './attack-status.vo.js';
import { CriticalEffect } from './critical-result.vo.js';
import { Critical } from './critical.vo.js';

export class ActionAttack {
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

export class ActionAttackResult {
  constructor(
    public attackTableEntry: AttackTableEntry | undefined,
    public criticals: Critical[] | undefined,
    public fumble: Fumble | undefined,
  ) {}
}
