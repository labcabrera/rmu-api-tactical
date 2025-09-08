import { Pace } from './action-movement.vo';

export interface ActionMovementModifiers {
  pace: Pace;
  requiredManeuver: boolean;
  skillId: string | undefined;
  difficulty: string | undefined;
  customBonus: number | undefined;
}

export interface ActionMovementRoll {
  rollModifiers: ActionMovementBonus[];
  roll: number;
  totalRoll: number;
}

export interface ActionMovementResult {
  bmr: number;
  paceMultiplier: number;
  percent: number;
  distance: number;
  distanceAdjusted: number;
  critical: string | undefined;
  description: string;
}

export interface ActionMovementBonus {
  key: string;
  value: number;
}
