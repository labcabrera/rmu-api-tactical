export class SubstractBoCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly attackName: string,
    public readonly bo: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
