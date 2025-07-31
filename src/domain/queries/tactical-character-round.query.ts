export interface TacticalCharacterRoundQuery {
    readonly gameId?: string;
    readonly round?: number;
    readonly characterId?: string;
    readonly searchExpression?: string;
    readonly tacticalGameId?: string;
    readonly page: number;
    readonly size: number;
}
