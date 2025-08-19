export class PrepareAttackCommand {
  constructor(
    public readonly actionId: string,
    public readonly attackType: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
