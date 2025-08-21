export class UpdateInitiativeCommand {
  constructor(
    public readonly characterRoundId: string,
    public readonly initiativeRoll: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
