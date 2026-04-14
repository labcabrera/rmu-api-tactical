import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command';

export class StartRoundCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
