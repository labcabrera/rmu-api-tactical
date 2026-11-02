import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

/** `PATCH /v1/actor-rounds/:id/hp`: hits taken (`dmg` > 0) or healed (`dmg` < 0) by the game master. */
export class AdjustHpCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly dmg: number,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
