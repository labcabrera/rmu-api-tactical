/** Marks as resolved an alert the game master handles by hand, such as the critical of a fumble (spec 034). */
export class ResolveAlertCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly alertId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
