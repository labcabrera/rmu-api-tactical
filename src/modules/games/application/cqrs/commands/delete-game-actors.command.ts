export class DeleteGameActorsCommand {
  constructor(
    public readonly gameId: string,
    public readonly actors: string[],
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
