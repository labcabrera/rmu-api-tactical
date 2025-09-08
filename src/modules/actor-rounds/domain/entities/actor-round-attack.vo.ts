export class ActorRoundAttack {
  attackName: string;
  boModifiers: BoModifiers[];
  /** Base attack without modifiers readed from character */
  baseBo: number;
  /** Current attack less parry amount and penalties applied */
  currentBo: number;
  attackType: 'melee' | 'ranged';
  attackTable: string;
  fumbleTable: string;
  attackSize: 'small' | 'medium' | 'big';
  fumble: number;
  canThrow: boolean;
}

export class BoModifiers {
  key: string;
  subKey?: string;
  value: number;
}
