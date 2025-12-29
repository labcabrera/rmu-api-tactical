import { ActionRoll } from './action-roll.vo';
import { ManeuverDifficulty } from './maneuver-dificulty.vo';

export type Pace = 'creep' | 'walk' | 'jog' | 'run' | 'sprint' | 'dash';

export class ActionMovement {
  constructor(
    public modifiers: ActionMovementModifiers,
    public roll: ActionRoll | undefined,
    public calculated: ActionMovementResult,
  ) {}
}

export class ActionMovementModifiers {
  constructor(
    public pace: Pace,
    public requiredManeuver: boolean,
    public skillId: string | undefined,
    public difficulty: ManeuverDifficulty | undefined,
    public customBonus: number | undefined,
  ) {}
}

export class ActionMovementResult {
  constructor(
    public bmr: number,
    public paceMultiplier: number,
    public percent: number,
    public distance: number,
    public distanceAdjusted: number,
    public critical: string | undefined,
    public description: string,
  ) {}
}
