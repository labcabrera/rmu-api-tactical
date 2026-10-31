import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

/** `POST /v1/actor-rounds/:id/herbs` (workspace spec 062): a dose of a herb of the character of the actor. */
export class UseHerbCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly itemId: string,
    /** Hits healed; missing: rolled in the range of the herb. */
    public readonly roll: number | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
