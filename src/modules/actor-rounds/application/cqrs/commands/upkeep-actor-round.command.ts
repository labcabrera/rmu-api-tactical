export class UpkeepActorRoundCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly round: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
