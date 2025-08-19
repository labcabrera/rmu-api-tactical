export class UpdateActionCommand {
  constructor(
    public readonly actionPoints: number | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
