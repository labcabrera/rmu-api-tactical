export class UpdateGameCommand {
  constructor(
    public readonly gameId: string,
    public readonly name: string,
    public readonly description: string | undefined,
    public readonly userId: string,
    public readonly roles: string[] | undefined,
  ) {}
}
