import { ActionAttack } from './action-attack.vo';
import { ActionManeuver } from './action-maneuver.vo';
import { ActionMovement } from './action-movement.vo';

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
