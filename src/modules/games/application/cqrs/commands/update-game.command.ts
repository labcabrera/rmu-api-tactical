import { GameEnvironment } from '../../../domain/value-objects/game-environment.vo';

export class UpdateGameCommand {
  constructor(
    public readonly gameId: string,
    public readonly name: string | undefined,
    public readonly environment: GameEnvironment | undefined,
    public readonly description: string | undefined,
    public readonly imageUrl: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
