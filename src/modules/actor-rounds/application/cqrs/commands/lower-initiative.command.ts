export class LowerInitiativeCommand {
  constructor(
    public readonly actorRoundId: string,
    /** The new total: lower than the current one, down to its value in negative. */
    public readonly total: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
