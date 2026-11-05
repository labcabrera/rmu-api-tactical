import type { AlertOutcome } from '../../../domain/value-objects/actor-round-alert.vo.js';

/**
 * Marks as resolved an alert the game master handles by hand, such as the critical of a fumble (spec 034). A Mental
 * Focus alert can carry its outcome (workspace spec 077, decision A2.4), and a death-threshold alert `confirmed` (spec 079).
 */
export class ResolveAlertCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly alertId: string,
    public readonly userId: string,
    public readonly roles: string[],
    public readonly outcome?: AlertOutcome,
  ) {}
}
