export class ApplyAttackCommand {
  constructor(
    public readonly actionId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
