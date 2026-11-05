/**
 * Rolls the critical of a `critical` alert and applies it (workspace spec 077, decision D3). `criticalType` is required
 * for a fumble, whose alert has none, and replaces the one of the alert otherwise.
 */
export class ResolveCriticalAlertCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly alertId: string,
    public readonly roll: number,
    public readonly criticalType: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
