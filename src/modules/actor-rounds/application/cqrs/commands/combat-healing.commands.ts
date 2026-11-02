import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

/** `POST /v1/actor-rounds/:id/injuries/:injuryId/tourniquet/loosen` (workspace spec 068, decision 5): 0 AP. */
export class LoosenTourniquetCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly injuryId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** `POST /v1/actor-rounds/:id/drop-items` (workspace spec 068, decision 14): a broken actor drops what it holds. */
export class DropItemsCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** `DELETE /v1/actor-rounds/:id/temporary-modifiers/:modifierId` (workspace spec 068, decision 19). */
export class DeleteTemporaryModifierCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly modifierId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
