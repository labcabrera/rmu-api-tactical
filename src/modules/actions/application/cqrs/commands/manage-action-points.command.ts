import type { ForceReason } from '../../../domain/value-objects/action-resolution.vo';

/** What the game master does with the AP of an open action (spec 011, §2, §4 and §6). */
export type ActionPointsOperation = 'spend-ap' | 'hold' | 'force';

export class ManageActionPointsCommand {
  constructor(
    public readonly actionId: string,
    public readonly operation: ActionPointsOperation,
    public readonly userId: string,
    public readonly roles: string[],
    /** `force` only: why the action is resolved out of turn. */
    public readonly reason?: ForceReason,
    public readonly note?: string,
  ) {}
}
