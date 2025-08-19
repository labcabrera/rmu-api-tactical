export type ActionType = 'attack' | 'absolute_maneuver' | 'static_maneuver';
export type ActionStatus = 'declared' | 'in_progress' | 'completed';
export type AttackStatus = 'declared' | 'in_progress' | 'completed';

export interface Action {
  id: string;
  gameId: string;
  characterId: string;
  status: ActionStatus;
  round: number;
  actionType: ActionType;
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
  status: AttackStatus;
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
