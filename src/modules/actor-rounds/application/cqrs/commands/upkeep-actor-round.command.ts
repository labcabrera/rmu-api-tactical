export class UpkeepActorRoundCommand {
  constructor(
    public readonly gameId: string,
    public readonly actorRoundId: string,
    public readonly round: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
