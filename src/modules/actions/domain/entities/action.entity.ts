import { ActionMovement } from './action-movement.entity';

export type ActionStatus = 'declared' | 'in_progress' | 'completed';
export type ActionType = 'attack' | 'maneuver' | 'movement';
export type ManeuverType = 'absolute' | 'percent';
export type ManeuverDifficulty =
  | 'casual'
  | 'simple'
  | 'routine'
  | 'easy'
  | 'light'
  | 'medium'
  | 'hard'
  | 'very_hard'
  | 'extremely_hard'
  | 'sheer_folly'
  | 'absurd'
  | 'nigh_impossible';

export interface Action {
  id: string;
  gameId: string;
  actorId: string;
  status: ActionStatus;
  round: number;
  actionType: ActionType;
  phaseStart: number;
  phaseEnd: number | undefined;
  actionPoints: number | undefined;
  movement: ActionMovement | undefined;
  attacks: ActionAttack[] | undefined;
  maneuver: ActionManeuver | undefined;
  fatigue: number | undefined;
  description: string | undefined;
  createdAt: Date;
  updatedAt: Date | undefined;
}

export interface ActionAttack {
  attackId: string | undefined;
  attackName: string;
  targetId: string;
  parry: number;
  status: ActionStatus;
}

export interface ActionManeuver {
  skillId: string;
  maneuverType: ManeuverType;
  difficulty: ManeuverDifficulty | undefined;
  result: ActionManeuverResult | undefined;
  status: ActionStatus;
}

export interface ActionManeuverResult {
  bonus: { [key: string]: number };
  roll: number;
  result: number;
  description: string;
}
