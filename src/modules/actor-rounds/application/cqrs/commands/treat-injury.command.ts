import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { TacticalProcedure } from '../../../domain/services/injury-treatment.js';
import type { HealerRequest } from '../../services/medical-roll.service.js';

/** Rolls of a cauterization (Table 13-1c, workspace spec 022, D7), made by the client like every other roll. */
export interface TreatInjuryRolls {
  /** First roll of the open-ended one, when it is not `roll`: an unmodified 66 is an unusual event. */
  unmodifiedRoll?: number;
  /** Sum of the d10 of extra hits the result gives; rolled by the server when missing. */
  heatHitsRoll?: number;
  /** Roll of the heat critical (1-100); without it the critical is left as an alert for the game master. */
  heatCriticalRoll?: number;
}

/** `POST /v1/actor-rounds/:id/injuries/:injuryId/treatments` (spec 013, §3). */
export class TreatInjuryCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly injuryId: string,
    public readonly procedure: TacticalProcedure,
    public readonly healer: HealerRequest,
    public readonly roll: number,
    /** Difficulty modifier; the procedure's when missing. */
    public readonly difficulty: number | undefined,
    userId: string,
    roles: string[],
    public readonly rolls: TreatInjuryRolls = {},
  ) {
    super(userId, roles);
  }
}
