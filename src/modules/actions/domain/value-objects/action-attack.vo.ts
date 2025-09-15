import { Modifier } from '../../../shared/domain/entities/modifier.vo';
import { ActionAttackModifiers } from './action-attack-modifiers.vo';
import { ActionStatus } from './action-status.vo';
import { AttackLocation } from './attack-location.vo';

export type ParryType = 'parry' | 'protect';

export class ActionAttack {
  constructor(
    public modifiers: ActionAttackModifiers,
    public parries: ActionAttackParry[] | undefined,
    public roll: ActionAttackRoll | undefined,
    public calculated: ActionAttackCalculated | undefined,
    public results: ActionAttackResult | undefined,
    public externalAttackId: string | undefined,
    public status: ActionStatus,
  ) {}
}

export class ActionAttackParry {
  constructor(
    public parryActorId: string,
    public targetId: string,
    public parryType: ParryType,
    public parryAvailable: number,
    public parry: number,
  ) {}
}

export class ActionAttackRoll {
  constructor(
    public roll: number,
    public location: AttackLocation | undefined,
    public criticalRolls: Map<string, number | undefined> | undefined,
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

export class ActionAttackResult {
  constructor(
    public attackTableEntry: AttackTableEntry | undefined,
    public criticals: Critical[] | undefined,
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
