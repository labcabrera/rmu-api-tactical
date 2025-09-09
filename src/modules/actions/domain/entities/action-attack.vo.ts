import { ActionStatus } from './action-status.vo';

export type AttackType = 'melee' | 'ranged' | 'thrown';

export class ActionAttack {
  constructor(
    public modifiers: ActionAttackModifiers,
    public externalAttackId: string | undefined,
    public status: ActionStatus,
  ) {}
}

export class ActionAttackModifiers {
  constructor(
    public attackName: string,
    public type: AttackType,
    public targetId: string,
    public parry: number,
    public bo: number,
    public cover: string | undefined,
    public restrictedQuarters: string | undefined,
    public positionalSource: string | undefined,
    public positionalTarget: string | undefined,
    public dodge: string | undefined,
    public range: string | undefined,
    public customBonus: string | undefined,
    public disabledDB: boolean | undefined,
    public disabledShield: boolean | undefined,
    public disabledParry: boolean | undefined,
  ) {}
}
