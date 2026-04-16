import { Pace } from '../../../domain/value-objects/action-movement.vo';
import { Difficulty } from '../../../domain/value-objects/dificulty.vo';

export class ResolveMovementModifiers {
  constructor(
    public readonly pace: Pace,
    public readonly requiredManeuver: boolean,
    public readonly skillId: string,
    public readonly difficulty: Difficulty | null,
  ) {}
}

export class ResolveMovementCommand {
  constructor(
    public readonly actionId: string,
    public readonly modifiers: ResolveMovementModifiers,
    public readonly roll: number | null,
    public readonly description: string | null,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
