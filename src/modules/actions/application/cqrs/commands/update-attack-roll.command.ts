export class UpdateAttackRollCommand {
  constructor(
    public readonly actionId: string,
    public readonly attackName: string,
    public readonly roll: number,
    public readonly locationRoll: number | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
