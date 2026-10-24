import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { HealerRequest } from '../../services/medical-roll.service.js';

/** `POST /v1/actor-rounds/:id/effects/:effectId/stabilize` (spec 013, §3). */
export class StabilizeEffectCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly effectId: string,
    public readonly healer: HealerRequest,
    public readonly roll: number,
    public readonly difficulty: number | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
