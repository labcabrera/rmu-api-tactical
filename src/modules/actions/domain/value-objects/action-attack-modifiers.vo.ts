import type { AttackMode } from '../services/special-maneuvers.js';

export type AttackType = 'melee' | 'ranged' | 'thrown';
export type CalledShot = 'none' | 'head' | 'chest' | 'abdomen' | 'arms' | 'legs';
export type PositionalSource = 'none' | 'to_flank' | 'to_rear';
export type PositionalTarget = 'none' | 'flank' | 'rear';
export type RestrictedQuarters = 'none' | 'close' | 'cramped' | 'tight' | 'confined';
export type Cover = 'none' | 'soft_partial' | 'soft_half' | 'soft_full' | 'hard_partial' | 'hard_half' | 'hard_full';
export type ChargeSpeed = 'none' | 'jog' | 'sprint';
/** Where a protector stands (Table 9-7c): between attacker and defender, behind the defender, or anywhere else. */
export type ProtectPosition = 'protector_between' | 'defender_between' | 'other';
export const PROTECT_POSITIONS: ProtectPosition[] = ['protector_between', 'defender_between', 'other'];

/** `spring` was the original (misspelt) value: still accepted as input and in stored actions. */
export const normalizeChargeSpeed = (value: string | undefined | null): ChargeSpeed => {
  switch (value) {
    case 'jog':
      return 'jog';
    case 'sprint':
    case 'spring':
      return 'sprint';
    default:
      return 'none';
  }
};

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
    /** Fighting style ability that changes the critical (workspace spec 032, group C). */
    public styleCriticalOption?: string,
  ) {}

  /** Normal attack, disarm (Table 9-7a) or subdual (Table 9-7e) (workspace spec 079, decision A7). Missing: normal. */
  public attackMode?: AttackMode;
  /** Disarm: the total of the defender's roll, entered (Table 9-7a). */
  public disarmDefenseRoll?: number | null;
  /** Disarm: the foe wields its weapon with both hands (Table 9-7a). */
  public disarmTwoHanded?: boolean;
  /** Subdual: the skill bonus the game master enters, which offsets the penalties (Table 9-7e; not a Core Law skill). */
  public subdualBonus?: number | null;
  /** Subdual: the target's anatomy is unfamiliar (Table 9-7e). */
  public unfamiliarAnatomy?: boolean;
  /** Ranged attack into a melee: the other combatants engaged with the target, which give cover (§9.7, decision A6). */
  public meleeCoverActorIds?: string[];
}
