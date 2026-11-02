export class UpdateActionCommand {
  constructor(
    public readonly actionId: string,
    public readonly description: string | undefined,
    public readonly userId: string,
    public readonly roles: string[],
    /** The version the client read; undefined applies the change to the current one. */
    public readonly expectedVersion?: number,
  ) {}
}
