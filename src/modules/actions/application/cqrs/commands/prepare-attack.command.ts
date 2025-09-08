export type CoverType = 'none' | 'soft_partial' | 'soft_half' | 'soft_full' | 'hard_partial' | 'hard_half' | 'hard_full';
export type RestrictedQuartersType = 'none' | 'close' | 'cramped' | 'tight' | 'confined';
export type PositionalSourceType = 'none' | 'to_flank' | 'to_rear';
export type PositionalTargetType = 'none' | 'flank' | 'rear';
export type DodgeType = 'none' | 'passive' | 'partial' | 'full';

export class PrepareAttackCommand {
  actionId: string;
  attackName: string;
  cover: CoverType;
  restrictedQuarters: RestrictedQuartersType;
  positionalSource: PositionalSourceType;
  positionalTarget: PositionalTargetType;
  dodge: DodgeType;
  disabledDB: boolean;
  disabledShield: boolean;
  disabledParry: boolean;
  customBonus: number | undefined;
  userId: string;
  roles: string[];
}
