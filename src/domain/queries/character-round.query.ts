export interface CharacterRoundQuery {
  readonly gameId?: string;
  readonly round?: number;
  readonly characterId?: string;
  readonly searchExpression?: string;
  readonly page: number;
  readonly size: number;
}
