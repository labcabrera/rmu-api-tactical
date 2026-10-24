import type { LightType } from './light-type.vo.js';
import { ActionRoll } from './action-roll.vo.js';
import type { Difficulty } from './difficulty.vo.js';
import type { Pace } from './pace.vo.js';

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
