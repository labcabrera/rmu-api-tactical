export class UpdateActionCommand {
  constructor(
    public readonly actionId: string,
    public readonly description: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
