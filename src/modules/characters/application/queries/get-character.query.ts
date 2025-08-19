export class GetCharacterQuery {
  constructor(
    public readonly characterId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
