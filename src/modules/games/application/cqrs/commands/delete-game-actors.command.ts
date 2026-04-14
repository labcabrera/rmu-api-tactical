import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command';

export class DeleteGameActorsCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly actors: string[],
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
