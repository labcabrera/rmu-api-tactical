export class UpdateFumbleRollCommand {
  constructor(
    public readonly actionId: string,
    public readonly attackName: string,
    public readonly fumbleRoll: number,
    public readonly userId: string,
    public readonly roles: string[],
    /** The game master's sum of the dice of the fumble hits (spec 034); rolled here when left out. */
    public readonly fumbleHits?: number,
    /** Workspace spec 076, §2.8: the die of the roll, checked when sent. */
    public readonly dice?: number[],
  ) {}
}
