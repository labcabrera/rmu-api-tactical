export class GetActorRoundQuery {
  constructor(
    public readonly actorRoundId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
