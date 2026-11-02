import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { FailureSeverity } from '../../../domain/value-objects/psychology-tables.vo.js';

/** `POST /v1/actor-rounds/:id/fear-effects` (workspace spec 068, decision 15): the result of an individual fear RR. */
export class ApplyFearEffectCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly severity: FailureSeverity,
    /** What frightened the actor. */
    public readonly source: { actorId?: string; name?: string } | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** `GET /v1/tactical-games/:id/fright-levels` (workspace spec 068, decision 20 S12 b). */
export class GetFrightLevelsQuery {
  constructor(
    public readonly gameId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
