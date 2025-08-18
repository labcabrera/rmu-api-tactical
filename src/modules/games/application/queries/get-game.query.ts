export class GetGameQuery {
  constructor(
    public readonly gameId: string,
    public readonly userId: string,
  ) {}
}
