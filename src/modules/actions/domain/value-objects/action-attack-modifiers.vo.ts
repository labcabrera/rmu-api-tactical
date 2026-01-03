export type AttackType = 'melee' | 'ranged' | 'thrown';
export type CalledShot = 'none' | 'head' | 'body' | 'arms' | 'legs';

export class ActionAttackModifiers {
  constructor(
    public targetId: string | undefined,
    public bo: number | undefined,
    public parry: number | undefined,
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
    public proneSource: boolean | undefined,
    public proneTarget: boolean | undefined,
    public attackerInMelee: boolean | undefined,
    public offHand: boolean | undefined,
    public ambush: boolean | undefined,
    public range: number | undefined,
    public customBonus: number | undefined,
  ) {}
}
