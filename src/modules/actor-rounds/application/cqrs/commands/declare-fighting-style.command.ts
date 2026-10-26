import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

/** Command to declare the fighting style an actor fights with (workspace spec 032), or none. */
export class DeclareFightingStyleCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly skillId: string | null,
    public readonly styleId: string | null,
    public readonly options: string[],
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
