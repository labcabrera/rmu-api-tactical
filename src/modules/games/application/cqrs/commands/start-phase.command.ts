export class StartPhaseCommand {
  constructor(
    public readonly gameId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
