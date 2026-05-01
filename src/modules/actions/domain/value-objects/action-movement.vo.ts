import { ActionRoll } from './action-roll.vo';
import { Difficulty } from './dificulty.vo';
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
