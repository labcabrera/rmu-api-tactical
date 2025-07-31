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
  result?: TacticalActionResult;
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
  damage?: TacticalActionDamage;
  [key: string]: any;
}

export interface TacticalActionDamage {
  points: number;
  type?: string;
  location?: string;
  [key: string]: any;
}

export interface TacticalActionResult {
  success: boolean;
  description?: string;
  effects?: TacticalActionEffect[];
  [key: string]: any;
}

export interface TacticalActionEffect {
  type: string;
  duration?: number;
  value?: number;
  target?: string;
  [key: string]: any;
}
