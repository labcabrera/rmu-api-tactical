export class StartRoundCommand {
  constructor(
    public readonly gameId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
