export type AttackType = 'melee' | 'ranged' | 'thrown';
export type CalledShot = 'none' | 'head' | 'body' | 'arms' | 'legs';

export class ActionAttackModifiers {
  constructor(
    public attackName: string,
    public type: AttackType,
    public targetId: string | undefined,
    public bo: number | undefined,
    public parry: number | undefined,
    public calledShot: CalledShot | undefined,
    public calledShotPenalty: number | undefined,
    public cover: string | undefined,
    public restrictedQuarters: string | undefined,
    public positionalSource: string | undefined,
    public positionalTarget: string | undefined,
    public dodge: string | undefined,
    public range: number | undefined,
    public disabledDB: boolean | undefined,
    public disabledShield: boolean | undefined,
    public disabledParry: boolean | undefined,
    public customBonus: number | undefined,
  ) {}
}
