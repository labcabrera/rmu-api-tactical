export class SubstractBoCommand {
  constructor(
    public readonly actorRoundId: string,
    /** All the attacks of one action: they spend together (workspace spec 082). */
    public readonly spends: { attackName: string; bo: number }[],
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
