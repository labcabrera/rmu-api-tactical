import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command';
import type { ActorFate } from '../../../domain/value-objects/tactical-game-outcome.vo';

/** `POST /v1/tactical-games/:id/finish` (spec 013, §3). */
export class FinishGameCommand extends AuthenticatedCommand {
  constructor(
    public readonly gameId: string,
    public readonly fates: ActorFate[],
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
