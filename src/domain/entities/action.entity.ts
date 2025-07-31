export interface Action {
  id: string;
  gameId: string;
  characterId: string;
  round: number;
  type: string;
  phaseStart?: number;
  actionPoints?: number;
  attackInfo?: ActionAttackInfo;
  attacks?: ActionAttack[];
  description?: string;
  result?: ActionResult;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ActionAttackInfo {
  weaponId?: string;
  targetId?: string;
  attackType?: string;
  bonus?: number;
  [key: string]: any;
}

export interface ActionAttack {
  roll: number;
  bonus: number;
  total: number;
  result?: string;
  damage?: ActionDamage;
  [key: string]: any;
}

export interface ActionDamage {
  points: number;
  type?: string;
  location?: string;
  [key: string]: any;
}

export interface ActionResult {
  success: boolean;
  description?: string;
  effects?: ActionEffect[];
  [key: string]: any;
}

export interface ActionEffect {
  type: string;
  duration?: number;
  value?: number;
  target?: string;
  [key: string]: any;
}
