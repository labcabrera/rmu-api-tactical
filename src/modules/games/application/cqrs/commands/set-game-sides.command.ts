import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { GameSide } from '../../../domain/value-objects/game-side.vo.js';

/** Workspace spec 100: the game master sets every side of a game in `created` status. */
export class SetGameSidesCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly sides: GameSide[],
    userId: string,
    roles: string[],
    /** The version the client read; undefined applies the change to the current one. */
    public readonly expectedVersion?: number,
  ) {
    super(userId, roles);
  }
}
