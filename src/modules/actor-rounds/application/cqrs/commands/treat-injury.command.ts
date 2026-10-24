import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { TacticalProcedure } from '../../../domain/services/injury-treatment.js';
import type { HealerRequest } from '../../services/medical-roll.service.js';

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
  ) {
    super(userId, roles);
  }
}
