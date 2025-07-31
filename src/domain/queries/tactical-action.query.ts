export interface TacticalActionQuery {
    readonly gameId?: string;
    readonly characterId?: string;
    readonly round?: number;
    readonly type?: string;
    readonly page: number;
    readonly size: number;
}