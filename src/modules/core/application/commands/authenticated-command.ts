export class AuthenticatedCommand {
  constructor(
    public readonly userId: string,
    public readonly roles?: string[],
  ) {}
}
