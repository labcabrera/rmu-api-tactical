import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';

/** `POST /v1/actor-rounds/:id/breath` (workspace spec 079, C4): the actor starts holding its breath in this round. */
export class StartBreathCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly prepared: boolean,
    public readonly underwater: boolean,
    /** The bonus of the sheet when missing (0 for an NPC without it). */
    public readonly constitutionBonus: number | undefined,
    public readonly note: string | null,
    userId: string,
    roles: string[],
    /** Workspace spec 079, D5: with Breath Holding, the actor stays inactive (×2) or meditates successfully (×3). */
    public readonly inactive = false,
    public readonly meditation = false,
  ) {
    super(userId, roles);
  }
}

/** `DELETE /v1/actor-rounds/:id/breath` (workspace spec 079, C4): the actor breathes again. */
export class StopBreathCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** `PATCH /v1/actor-rounds/:id/environment-protection` (workspace spec 079, C3). */
export class SetEnvironmentProtectionCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly value: boolean,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
