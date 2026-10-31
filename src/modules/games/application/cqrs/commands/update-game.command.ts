import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import { GameEnvironment } from '../../../domain/value-objects/game-environment.vo.js';

export class UpdateGameCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly name: string | undefined,
    public readonly environment: GameEnvironment | undefined,
    public readonly description: string | undefined,
    public readonly imageUrl: string | undefined,
    userId: string,
    roles: string[],
    /** The version the client read; undefined applies the change to the current one. */
    public readonly expectedVersion?: number,
    /** Spec 055: the new name of the environment faction. */
    public readonly environmentFactionName?: string,
  ) {
    super(userId, roles);
  }
}
