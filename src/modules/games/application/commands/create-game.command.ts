export class CreateGameCommand {
  constructor(
    public readonly name: string,
    public readonly description: string | undefined,
    public readonly factions: string[] | undefined,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
