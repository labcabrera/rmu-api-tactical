export type ActionStatus = 'declared' | 'in_progress' | 'completed';
export type ActionType = 'attack' | 'maneuver';
export type ManeuverType = 'absolute' | 'percentage';
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
  actionPoints: number;
  attacks: ActionAttack[] | undefined;
  maneuver: ActionManeuver | undefined;
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
