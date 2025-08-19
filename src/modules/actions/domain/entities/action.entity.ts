export interface Action {
  id: string;
  gameId: string;
  characterId: string;
  round: number;
  actionType: string;
  phaseStart: number;
  actionPoints: number;
  attacks: ActionAttack[] | undefined;
  result: ActionResult | undefined;
  description: string | undefined;
  createdAt: Date;
  updatedAt: Date | undefined;
}

export interface ActionAttack {
  attackId: string | undefined;
  attackType: string;
  targetId: string;
  parry: number;
  status: 'declared' | 'in_progress' | 'resolved';
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
