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

export interface TacticalGameSearchCriteria {
    searchExpression?: string;
    username?: string;
    page: number;
    size: number;
}
