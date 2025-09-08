export class DeleteGameCommand {
  constructor(
    public readonly gameId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
