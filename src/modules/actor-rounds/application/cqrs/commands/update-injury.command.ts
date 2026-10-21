import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command';
import type { InjuryPatch } from '../../../domain/aggregates/actor-round.aggregate';

/** `PATCH /v1/actor-rounds/:id/injuries/:injuryId`: the game master edits an injury. */
export class UpdateInjuryCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly injuryId: string,
    public readonly patch: InjuryPatch,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
