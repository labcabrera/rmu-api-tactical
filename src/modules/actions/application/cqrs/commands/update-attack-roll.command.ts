export class UpdateAttackRollCommand {
  constructor(
    public readonly actionId: string,
    public readonly attackName: string,
    public readonly roll: number,
    public readonly userId: string,
    public readonly roles: string[],
    /** First die of the open-ended roll; `roll` when it is missing. */
    public readonly unmodified?: number,
    /** Every die of the open-ended roll, in order. */
    public readonly rolls?: number[],
    /** Workspace spec 076: the d10 rounds of the spasm of a natural 66 (Spasm); rolled here when left out. */
    public readonly spasmRounds?: number,
  ) {}
}
