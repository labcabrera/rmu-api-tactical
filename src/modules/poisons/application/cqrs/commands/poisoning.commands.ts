import type { AntidoteData, PoisonData } from '../../../../actor-rounds/domain/value-objects/poison.vo.js';
import type { ResistanceModifier } from '../../../../psychology/domain/services/resistance-roll.calculator.js';
import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

/** `POST /v1/actor-rounds/:id/poisonings`: a poison reaches the actor (workspace spec 042, decision 9). */
export class CreatePoisoningCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly poison: PoisonData,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** `POST /v1/actor-rounds/:id/poisonings/:exposureId/resolve`: the poison RR of an exposure. */
export class ResolvePoisoningCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly exposureId: string,
    /** Missing: the server rolls it. */
    public readonly roll: number | undefined,
    public readonly modifiers: ResistanceModifier[],
    /** The game master's bonus, for an actor without one in its sheet (NPCs). */
    public readonly bonus: number | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** `DELETE /v1/actor-rounds/:id/poisonings/:exposureId`: the game master drops an exposure. */
export class DismissPoisoningCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly exposureId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** `POST /v1/actor-rounds/:id/injuries/:injuryId/antidote` (decision 10). */
export class GiveAntidoteCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly injuryId: string,
    public readonly antidote: AntidoteData,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
