export type Pace = 'creep' | 'walk' | 'jog' | 'run' | 'sprint' | 'dash';

export class ActionMovement {
  constructor(
    public modifiers: ActionMovementModifiers,
    public roll: ActionMovementRoll | undefined,
    public calculated: ActionMovementResult,
  ) {}
}

export class ActionMovementModifiers {
  constructor(
    public pace: Pace,
    public requiredManeuver: boolean,
    public skillId: string | undefined,
    public difficulty: string | undefined,
    public customBonus: number | undefined,
  ) {}
}

export class ActionMovementRoll {
  constructor(
    public rollModifiers: ActionMovementBonus[],
    public roll: number,
    public totalRoll: number,
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

export class ActionMovementBonus {
  constructor(
    public key: string,
    public value: number,
  ) {}
}
