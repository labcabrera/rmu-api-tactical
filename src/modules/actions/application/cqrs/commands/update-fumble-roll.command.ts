export class UpdateFumbleRollCommand {
  constructor(
    public readonly actionId: string,
    public readonly attackName: string,
    public readonly fumbleRoll: number,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
