export interface TacticalCharacterQuery {
    readonly searchExpression?: string;
    readonly tacticalGameId?: string;
    readonly page: number;
    readonly size: number;
}
