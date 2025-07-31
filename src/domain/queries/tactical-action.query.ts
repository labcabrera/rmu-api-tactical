export interface TacticalActionQuery {
    readonly gameId?: string;
    readonly characterId?: string;
    readonly round?: number;
    readonly actionType?: string;
    readonly page: number;
    readonly size: number;
}