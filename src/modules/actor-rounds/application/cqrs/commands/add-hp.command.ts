export class AddHpCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly hp: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
