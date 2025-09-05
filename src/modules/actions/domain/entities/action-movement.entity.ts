export interface ActionMovement {
  modifiers: ActionMovementModifiers;
  roll: ActionMovementRoll | undefined;
  calculated: ActionMovementResult;
}

export interface ActionMovementModifiers {
  pace: string;
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
  critical: string | undefined;
  description: string;
}

export interface ActionMovementBonus {
  key: string;
  value: number;
}
