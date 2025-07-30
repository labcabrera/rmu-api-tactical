export interface TacticalGameDTO {
    id: string;
    name: string;
    status?: string;
    round: number;
    phase?: string;
    factions: string[];
    description?: string;
    user: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface TacticalCharacterDTO {
    id: string;
    gameId: string;
    name: string;
    faction?: string;
    hitPoints?: number;
    maxHitPoints?: number;
    initiative?: number;
    status?: string;
    position?: {
        x: number;
        y: number;
        z?: number;
    };
    createdAt?: Date;
    updatedAt?: Date;
}

export interface TacticalActionDTO {
    id: string;
    tacticalGameId: string;
    round: number;
    tacticalCharacterId: string;
    type: string;
    phaseStart?: string;
    actionPoints?: number;
    attackInfo?: any;
    attacks?: any[];
    description?: string;
    result?: any;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface TacticalCharacterRoundDTO {
    id: string;
    tacticalGameId: string;
    round: number;
    tacticalCharacterId: string;
    initiative?: any;
    actionPoints?: number;
    createdAt?: Date;
    updatedAt?: Date;
}