import { Pace } from '../../../domain/value-objects/action-movement.vo';

export class ResolveMovementModifiers {
  constructor(
    public readonly pace: Pace,
    public readonly requiredManeuver: boolean,
    public readonly skillId?: string,
    public readonly difficulty?: string,
  ) {}
}

export class ResolveMovementCommand {
  constructor(
    public readonly actionId: string,
    public readonly modifiers: ResolveMovementModifiers,
    public readonly roll: number | undefined,
    public readonly description: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
