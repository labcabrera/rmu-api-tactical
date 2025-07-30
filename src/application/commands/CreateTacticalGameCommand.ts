export interface CreateTacticalGameCommand {
    user: string;
    name: string;
    description?: string;
    factions?: string[];
}
