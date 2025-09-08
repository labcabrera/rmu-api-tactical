export class DeclareInitiativeCommand {
  constructor(
    public readonly actorRoundId: string,
    public readonly initiativeRoll: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
