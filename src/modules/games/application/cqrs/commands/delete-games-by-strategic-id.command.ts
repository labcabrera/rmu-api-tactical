import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command';

/**
 * Deletes all games associated with a specific strategic identifier.
 */
export class DeleteGamesByStrategicIdCommand extends AuthenticatedCommand {
  constructor(
    public readonly strategicGameId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
