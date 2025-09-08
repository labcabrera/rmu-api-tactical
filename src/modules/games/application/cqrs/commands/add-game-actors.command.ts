import { CreateGameCommandActor } from './create-game.command';

export class AddGameActorsCommand {
  constructor(
    public readonly gameId: string,
    public readonly actors: CreateGameCommandActor[],
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
