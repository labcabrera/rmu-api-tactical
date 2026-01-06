export class ActionAttackRoll {
  constructor(
    public roll: number,
    public locationRoll: number | undefined,
    public criticalRolls: Map<string, number | undefined> | undefined,
    public fumbleRoll: number | undefined,
  ) {}
}
