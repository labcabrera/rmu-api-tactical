import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command';
import { ValidationError } from '../../../../shared/domain/errors';

export class AddFatigueCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string | undefined,
    public readonly actorId: string | undefined,
    public readonly round: number | undefined,
    public readonly fatigue: number,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
    if (actorRoundId) {
      if (actorId || round) {
        throw new ValidationError('If actorRoundId is provided, actorId and round must be undefined');
      }
    } else {
      if (actorId === undefined || round === undefined) {
        throw new ValidationError('If actorRoundId is not provided, both actorId and round must be defined');
      }
    }
  }
}
