import { ActionMovementModifiers } from '../../../domain/value-objects/action-movement.vo';

export class ResolveMovementCommand {
  constructor(
    public readonly actionId: string,
    public readonly modifiers: ActionMovementModifiers,
    public readonly roll: number | null,
    public readonly description: string | null,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
