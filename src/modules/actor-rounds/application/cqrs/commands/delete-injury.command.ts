import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

/** `DELETE /v1/actor-rounds/:id/injuries/:injuryId`: the game master removes an injury. */
export class DeleteInjuryCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly injuryId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
