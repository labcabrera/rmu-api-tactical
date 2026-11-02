/** Weapon kind for the light weapon bonuses of multiple attacks (Table 9-7b). */
export type WeaponCategory = 'standard' | 'light' | 'dagger' | 'natural';

export class ActorRoundAttack {
  attackName: string;
  boModifiers: BoModifiers[];
  /** Base attack without modifiers readed from character */
  baseBo: number;
  /** Current attack less parry amount and penalties applied */
  currentBo: number;
  type: 'melee' | 'ranged';
  attackTable: string;
  fumbleTable: string;
  attackSize: number;
  fumble: number;
  canThrow: boolean;
  meleeRange: number | null;
  ranges: AttackRange[] | null;
  /** The weapon is wielded with both hands (§9.5). */
  twoHanded: boolean;
  weaponCategory: WeaponCategory;
  /** Skill of the weapon (`melee-weapon@blade`, `shield`...), null for attacks stored before it existed. */
  skillId: string | null;
  /** Item of the attack (spec 019): `ActorRound.items`. Null for attacks stored before it existed. */
  itemId: string | null = null;
  /** Breakage damage the item took in the game, applied to `currentBo` (the base OB counts the earlier one). */
  breakagePenalty = 0;
  /** The item broke in the game: the attack cannot be declared. */
  broken = false;
  /** Workspace spec 032: tags of the weapon type (fencing, quarterstaff...) for the fighting style requirements. */
  weaponTags: string[] = [];
  /**
   * Workspace spec 040: times St enters the skill bonus of the attack, for the Strength bonus of Frenzy. Null for
   * attacks of characters not recalculated since: the rules then count 2 for melee and 1 for ranged.
   */
  strengthWeight: number | null = null;

  constructor(
    attackName: string,
    boModifiers: BoModifiers[],
    baseBo: number,
    currentBo: number,
    type: 'melee' | 'ranged',
    attackTable: string,
    fumbleTable: string,
    attackSize: number,
    fumble: number,
    canThrow: boolean,
    meleeRange: number | null,
    ranges: AttackRange[] | null,
    twoHanded = false,
    weaponCategory: WeaponCategory = 'standard',
    skillId: string | null = null,
  ) {
    this.attackName = attackName;
    this.boModifiers = boModifiers;
    this.baseBo = baseBo;
    this.currentBo = currentBo;
    this.type = type;
    this.attackTable = attackTable;
    this.fumbleTable = fumbleTable;
    this.attackSize = attackSize;
    this.fumble = fumble;
    this.canThrow = canThrow;
    this.meleeRange = meleeRange;
    this.ranges = ranges;
    this.twoHanded = twoHanded;
    this.weaponCategory = weaponCategory;
    this.skillId = skillId;
  }

  calculateRangeBonus(range: number): number {
    if (!this.ranges || this.ranges.length === 0) {
      throw new Error('No ranges defined for this attack');
    }
    for (const attackRange of this.ranges) {
      if (range >= attackRange.from && range <= attackRange.to) {
        return attackRange.bonus;
      }
    }
    throw new Error('Invalid range for this attack');
  }
}

export class BoModifiers {
  key: string;
  subKey?: string;
  value: number;
}

export class AttackRange {
  from: number;
  to: number;
  bonus: number;
}
