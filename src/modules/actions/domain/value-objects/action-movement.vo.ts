import type { LightType } from './light-type.vo';
import { ActionRoll } from './action-roll.vo';
import { Difficulty } from './difficulty.vo';
import { Pace } from './pace.vo';

export class ActionMovement {
  constructor(
    public modifiers: ActionMovementModifiers,
    public roll: ActionRoll | null,
    public calculated: ActionMovementResult,
  ) {}
}

export class ActionMovementModifiers {
  constructor(
    public pace: Pace,
    public requiredManeuver: boolean,
    public skillId: string | null,
    public difficulty: Difficulty | null,
    public customBonus: number | null,
    // Light of the environment (Table 5-1), helpful for movement maneuvers
    public light?: LightType | null,
  ) {}
}

export class ActionMovementResult {
  constructor(
    public bmr: number,
    public paceMultiplier: number,
    public percent: number,
    public distance: number,
    public distanceAdjusted: number,
    public critical: string | null,
    public description: string,
  ) {}
}
