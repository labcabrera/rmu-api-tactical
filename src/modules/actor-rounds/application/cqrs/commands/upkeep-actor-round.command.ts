export class UpkeepActorRoundCommand {
  constructor(
    public readonly gameId: string,
    public readonly actorRoundId: string,
    public readonly round: number,
    public readonly userId: string,
    public readonly roles: string[],
    /** Workspace spec 077, decision D7: a negative altitude modifier doubles the rest a point of fatigue takes. */
    public readonly slowFatigueRecovery = false,
  ) {}
}
