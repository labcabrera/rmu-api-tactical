export class GetCharacterRoundQuery {
  constructor(
    public readonly characterRoundId: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
