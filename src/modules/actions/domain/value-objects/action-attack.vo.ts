import { ActionAttackCalculated } from './action-attack-calculated.vo';
import { ActionAttackModifiers, AttackType } from './action-attack-modifiers.vo';
import { ActionAttackRoll } from './action-attack-roll.vo';
import { AttackStatus } from './attack-status.vo';
import { Critical } from './critical.vo';

export class ActionAttack {
  constructor(
    public attackName: string,
    public type: AttackType,
    public modifiers: ActionAttackModifiers,
    public roll: ActionAttackRoll | undefined,
    public calculated: ActionAttackCalculated | undefined,
    public results: ActionAttackResult | undefined,
    public externalAttackId: string | undefined,
    public status: AttackStatus,
    public protectors: string[] | null,
  ) {}

  //TODO make non static
  static isCalledShot(attack: ActionAttack): boolean {
    return attack.modifiers.calledShot !== undefined && attack.modifiers.calledShot !== 'none';
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

export class CriticalResult {
  constructor(
    public text: string,
    public damage: number,
    public location: string,
    public effects: CriticalEffect[],
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

export class CriticalEffect {
  constructor(
    public status: string,
    public rounds: number | undefined,
    public value: number | undefined,
    public delay: number | undefined,
    public condition: string | undefined,
  ) {}
}
