import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command';
import { CreateGameCommandActor } from './create-game.command';

export class AddGameActorsCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly actors: CreateGameCommandActor[],
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
