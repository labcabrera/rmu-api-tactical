import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command';
import { GameEnvironment } from '../../../domain/value-objects/game-environment.vo';

export class UpdateGameCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly name: string | undefined,
    public readonly environment: GameEnvironment | undefined,
    public readonly description: string | undefined,
    public readonly imageUrl: string | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
