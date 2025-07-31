export interface TacticalCharacterQuery {
    readonly searchExpression?: string;
    readonly gameId?: string;
    readonly page: number;
    readonly size: number;
}
