export class DeleteActionCommand {
  constructor(
    public readonly actionId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
