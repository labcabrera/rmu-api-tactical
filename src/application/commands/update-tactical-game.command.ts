export interface UpdateTacticalGameCommand {
    readonly gameId: string;
    readonly name?: string;
    readonly description?: string;
}
