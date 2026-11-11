export class UpdateCriticalRollCommand {
  constructor(
    public readonly actionId: string,
    public readonly attackName: string,
    public readonly criticalKey: string,
    public readonly roll: number,
    public readonly userId: string,
    public readonly roles: string[],
    /** Fighting style ability decided before the critical roll (workspace spec 032). */
    public readonly styleOption?: string,
    /** Workspace spec 076, decision B8: roll again a critical already rolled, with a `critical-reroll` effect. */
    public readonly reroll?: boolean,
    /** Workspace spec 076, §2.8: the die of the roll, checked when sent. */
    public readonly dice?: number[],
  ) {}
}
