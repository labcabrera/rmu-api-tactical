export class AddGameFactionsCommand {
  constructor(
    public readonly gameId: string,
    public readonly factions: string[],
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
