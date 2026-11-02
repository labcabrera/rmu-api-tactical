import { ActionMovementModifiers } from '../../../domain/value-objects/action-movement.vo.js';

export class ResolveMovementCommand {
  constructor(
    public readonly actionId: string,
    public readonly modifiers: ActionMovementModifiers,
    public readonly roll: number | null,
    public readonly description: string | null,
    public readonly userId: string,
    public readonly roles: string[],
    /** Workspace spec 068: go on despite the warnings that need a confirmation. */
    public readonly confirm = false,
  ) {}
}
