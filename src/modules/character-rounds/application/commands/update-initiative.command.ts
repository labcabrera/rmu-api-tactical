export class UpdateInitiativeCommand {
  constructor(
    public readonly characterRoundId: string,
    public readonly initiativeRoll: number,
  ) {}
}
