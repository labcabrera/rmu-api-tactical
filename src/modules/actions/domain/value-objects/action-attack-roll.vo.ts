export class ActionAttackRoll {
  constructor(
    public roll: number,
    public criticalRolls: Map<string, number | undefined> | undefined,
    public fumbleRoll: number | undefined,
    /** First die of the open-ended attack roll, kept so the fumble check can be repeated. */
    public unmodified?: number,
  ) {}
}
