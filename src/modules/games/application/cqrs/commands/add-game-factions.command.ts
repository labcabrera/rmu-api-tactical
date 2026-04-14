import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command';

export class AddGameFactionsCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly factions: string[],
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
