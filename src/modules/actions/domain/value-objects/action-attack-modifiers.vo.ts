export type AttackType = 'melee' | 'ranged' | 'thrown';
export type CalledShot = 'none' | 'head' | 'chest' | 'abdomen' | 'arms' | 'legs';
export type PositionalSource = 'none' | 'to_flank' | 'to_rear';
export type PositionalTarget = 'none' | 'flank' | 'rear';
export type RestrictedQuarters = 'none' | 'close' | 'cramped' | 'tight' | 'confined';
export type Cover = 'none' | 'soft_partial' | 'soft_half' | 'soft_full' | 'hard_partial' | 'hard_half' | 'hard_full';
export type Dodge = 'none' | 'passive' | 'partial' | 'full';
export type ChargeSpeed = 'none' | 'jog' | 'spring';

export class ActionAttackModifiers {
  constructor(
    public targetId: string | undefined,
    public bo: number | undefined,
    public parry: number | undefined,
    public calledShot: CalledShot | undefined,
    public calledShotPenalty: number | undefined,
    public positionalSource: PositionalSource | undefined,
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
    public proneSource: boolean | undefined,
    public proneTarget: boolean | undefined,
    public attackerInMelee: boolean | undefined,
    public offHand: boolean | undefined,
    public ambush: boolean | undefined,
    public range: number | undefined,
    public customBonus: number | undefined,
    public chargeSpeed: ChargeSpeed | undefined,
  ) {}
}
