export interface TacticalGame {
    id?: string;
    user: string;
    name: string;
    description?: string | undefined;
    status: 'created' | 'in-progress' | 'finished';
    factions: string[];
    round: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CreateTacticalGameCommand {
    user: string;
    name: string;
    description?: string;
    factions?: string[];
}

export interface UpdateTacticalGameCommand {
    name?: string;
    description?: string;
}

export interface TacticalGameSearchCriteria {
    searchExpression?: string;
    username?: string;
    page: number;
    size: number;
}

export interface PaginatedTacticalGames {
    content: TacticalGame[];
    page: number;
    size: number;
    total: number;
    totalPages: number;
}
