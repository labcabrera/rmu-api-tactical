import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command';
import { ValidationError } from '../../../../shared/domain/errors/errors';

export class AddFatigueCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string | undefined,
    public readonly gameId: string | undefined,
    public readonly actorId: string | undefined,
    public readonly round: number | undefined,
    public readonly fatigue: number,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
    if (actorRoundId) {
      if (gameId || actorId || round) {
        throw new ValidationError('If actorRoundId is provided, gameId, actorId and round must be undefined');
      }
    } else {
      if (gameId === undefined || actorId === undefined || round === undefined) {
        throw new ValidationError('If actorRoundId is not provided, gameId, actorId and round must be defined');
      }
    }
  }
}
