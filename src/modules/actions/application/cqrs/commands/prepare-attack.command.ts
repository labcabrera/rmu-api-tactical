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
    public readonly parries: PrepareAttackCommandParryItem[] | undefined,
    public readonly userId,
    public readonly userRoles,
  ) {}
}

export class PrepareAttackCommandItem {
  constructor(
    public readonly attackName: string,
    public readonly targetId: string,
    public readonly bo: number,
    public readonly calledShot: CalledShot | undefined,
    public readonly cover: CoverType | undefined,
    public readonly restrictedQuarters: RestrictedQuartersType | undefined,
    public readonly positionalSource: PositionalSourceType | undefined,
    public readonly positionalTarget: PositionalTargetType | undefined,
    public readonly dodge: DodgeType | undefined,
    public readonly range: number | undefined,
    public readonly disabledDB: boolean | undefined,
    public readonly disabledShield: boolean | undefined,
    public readonly disabledParry: boolean | undefined,
    public readonly customBonus: number | undefined,
  ) {}
}

export class PrepareAttackCommandParryItem {
  constructor(
    public parryActorId: string,
    public targetId: string,
  ) {}
}
