import { AuthenticatedCommand } from '../../../../shared/application/cqrs/authenticated-command.js';
import type { ReviveMethod } from '../../../domain/services/limb-and-life-rules.js';
import type { BodySide } from '../../../domain/value-objects/injury.vo.js';
import type { LostLimbLocation } from '../../../domain/value-objects/lost-limb.vo.js';
import type { HealerRequest } from '../../services/medical-roll.service.js';

/** `POST /v1/actor-rounds/:id/amputations` (workspace spec 079, C1): an emergency amputation in combat. */
export class AmputateLimbCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly location: LostLimbLocation,
    public readonly side: BodySide,
    public readonly injuryId: string | undefined,
    public readonly healer: HealerRequest,
    public readonly roll: number,
    /** Difficulty modifier chosen by the game master; -30 when missing. */
    public readonly difficulty: number | undefined,
    /** Sum of the 2d10 rounds of system shock of an absolute failure; rolled by the server when missing. */
    public readonly systemShockRoll: number | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}

/** `POST /v1/actor-rounds/:id/revive` (workspace spec 079, C6): reviving a dead body. */
export class ReviveActorCommand extends AuthenticatedCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly method: ReviveMethod,
    public readonly healer: HealerRequest,
    public readonly roll: number,
    /** Defibrillation: -20 (best source) to -70; -20 when missing. Ignored by the other methods. */
    public readonly defibrillationDifficulty: number | undefined,
    /** Defibrillation: a dangerous source (a spell, a storm) shocks the patient (Table 13-2a). */
    public readonly dangerousSource: boolean,
    /** Sum of the d10 of hits of the shock; rolled by the server when missing. */
    public readonly shockHitsRoll: number | undefined,
    userId: string,
    roles: string[],
  ) {
    super(userId, roles);
  }
}
