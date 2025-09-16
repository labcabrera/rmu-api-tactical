export type AttackType = 'melee' | 'ranged' | 'thrown';
export type CalledShot = 'none' | 'head' | 'body' | 'arms' | 'legs';

export class ActionAttackModifiers {
  constructor(
    public attackName: string,
    public type: AttackType,
    public targetId: string,
    public bo: number,
    public parry: number,
    public calledShot: CalledShot,
    public calledShotPenalty: number,
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
