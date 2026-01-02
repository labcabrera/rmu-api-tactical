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
  attackSize: 'small' | 'medium' | 'big';
  fumble: number;
  canThrow: boolean;
  ranges: AttackRange[] | undefined;

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
