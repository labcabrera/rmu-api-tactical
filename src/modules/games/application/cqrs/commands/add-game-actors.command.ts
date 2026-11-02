import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import { CreateGameCommandActor, type GameNpcRequest } from './create-game.command.js';

export class AddGameActorsCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly actors: CreateGameCommandActor[],
    userId: string,
    roles: string[],
    /** Spec 055: NPCs for the factions of the game (or `environment`). */
    public readonly npcs: GameNpcRequest[] = [],
  ) {
    super(userId, roles);
  }
}
