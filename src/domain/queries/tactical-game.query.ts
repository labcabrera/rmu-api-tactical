export interface TacticalGameQuery {
    readonly searchExpression?: string;
    readonly username?: string;
    readonly page: number;
    readonly size: number;
}
