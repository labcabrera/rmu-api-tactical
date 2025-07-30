export interface TacticalCharacterSearchCriteria {
    searchExpression?: string;
    tacticalGameId?: string;
    page: number;
    size: number;
}

export interface CreateTacticalCharacterCommand {
    user: string;
    tacticalGameId: string;
    faction: string;
    name: string;
    info: {
        race: string;
        level?: number;
    };
    endurance: {
        max: number;
    };
    hp: {
        max: number;
    };
    statistics?: any;
    skills?: any;
}

export interface UpdateTacticalCharacterCommand {
    name?: string;
    faction?: string;
    hitPoints?: number;
    maxHitPoints?: number;
    initiative?: number;
    status?: string;
    position?: {
        x?: number;
        y?: number;
        z?: number;
    };
    skills?: Array<{
        name: string;
        value: number;
        modifier?: number;
    }>;
    equipment?: Array<{
        name: string;
        type: string;
        equipped: boolean;
        properties?: any;
    }>;
}

export interface TacticalCharacterEntity {
    id: string;
    gameId: string;
    name: string;
    faction?: string;
    hitPoints?: number;
    maxHitPoints?: number;
    initiative?: number;
    status?: string;
    position?: {
        x?: number;
        y?: number;
        z?: number;
    };
    skills?: Array<{
        name: string;
        value: number;
        modifier?: number;
    }>;
    equipment?: Array<{
        name: string;
        type: string;
        equipped: boolean;
        properties?: any;
    }>;
    createdAt?: Date;
    updatedAt?: Date;
}
