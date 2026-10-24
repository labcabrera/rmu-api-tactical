import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { BreakageModifier } from '../../../domain/services/breakage-resolver.js';

/** `POST /v1/actor-rounds/:id/breakage-checks` (spec 019, §2): a breakage check of an item of the actor. */
export class ResolveBreakageCheckCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly itemId: string,
    public readonly roll: number,
    public readonly unmodifiedRoll: number | undefined,
    public readonly alertId: string | undefined,
    public readonly strength: number | undefined,
    public readonly modifiers: BreakageModifier[],
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
