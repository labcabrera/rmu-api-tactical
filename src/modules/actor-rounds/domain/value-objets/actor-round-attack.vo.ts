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
