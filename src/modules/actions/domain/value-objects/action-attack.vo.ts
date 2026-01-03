import { Modifier } from '../../../shared/domain/entities/modifier.vo';
import { ActionAttackModifiers, AttackType } from './action-attack-modifiers.vo';
import { AttackLocation } from './attack-location.vo';
import { AttackStatus } from './attack-status.vo';

export type ParryType = 'parry' | 'protect';

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
  ) {}
}

export class ActionParry {
  constructor(
    public readonly id: string,
    /** Actor identifier. Can be the target of the attack or a protector */
    public readonly actorId: string,
    /** Actor who is the target of the attack (in two handed melee combat one attacker can attack two targets) */
    public readonly targetActorId: string,
    public readonly parryType: ParryType,
    /** Name of the attack used to parry */
    public readonly parryAvailable: number,
    public parry: number,
  ) {}
}

export class ActionAttackRoll {
  constructor(
    public roll: number,
    public location: AttackLocation | undefined,
    public criticalRolls: Map<string, number | undefined> | undefined,
    public fumbleRoll: number | undefined,
  ) {}
}

export class ActionAttackCalculated {
  constructor(
    public rollModifiers: Modifier[],
    public rollTotal: number,
  ) {}
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

export class Critical {
  constructor(
    public key: string,
    public status: string,
    public criticalType: string,
    public criticalSeverity: string,
    public adjustedRoll: number | undefined,
    public result: CriticalResult | undefined,
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
