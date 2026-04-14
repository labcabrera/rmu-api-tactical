import { CalledShot } from '../../../domain/value-objects/action-attack-modifiers.vo';

export type CoverType = 'none' | 'soft_partial' | 'soft_half' | 'soft_full' | 'hard_partial' | 'hard_half' | 'hard_full';
export type RestrictedQuartersType = 'none' | 'close' | 'cramped' | 'tight' | 'confined';
export type PositionalSourceType = 'none' | 'to_flank' | 'to_rear';
export type PositionalTargetType = 'none' | 'flank' | 'rear';
export type DodgeType = 'none' | 'passive' | 'partial' | 'full';

export class PrepareAttackCommand {
  constructor(
    public readonly actionId: string,
    public readonly attacks: PrepareAttackCommandItem[],
    public readonly userId,
    public readonly userRoles,
  ) {}
}

export class PrepareAttackCommandItem {
  constructor(
    public attackName: string,
    public modifiers: PrepareAttackCommandModifiers,
  ) {}
}

export class PrepareAttackCommandModifiers {
  constructor(
    public targetId: string,
    public bo: number,
    public calledShot: CalledShot | undefined,
    public calledShotPenalty: number | undefined,
    public positionalSource: string | undefined,
    public positionalTarget: string | undefined,
    public restrictedQuarters: string | undefined,
    public cover: string | undefined,
    public dodge: string | undefined,
    public disabledDB: boolean | undefined,
    public disabledShield: boolean | undefined,
    public disabledParry: boolean | undefined,
    public pace: string | undefined,
    public restrictedParry: boolean | undefined,
    public higherGround: boolean | undefined,
    public stunnedFoe: boolean | undefined,
    public surprisedFoe: boolean | undefined,
    public proneTarget: boolean | undefined,
    public proneSource: boolean | undefined,
    public attackerInMelee: boolean | undefined,
    public offHand: boolean | undefined,
    public ambush: boolean | undefined,
    public range: number | undefined,
    public customBonus: number | undefined,
  ) {}
}

export class PrepareAttackCommandParryItem {
  constructor(
    public parryActorId: string,
    public targetId: string,
  ) {}
}
