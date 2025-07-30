export interface TacticalCharacterRoundEntity {
    id: string;
    gameId: string;
    tacticalCharacterId: string;
    round: number;
    initiative?: TacticalCharacterRoundInitiative;
    actionPoints?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface TacticalCharacterRoundInitiative {
    base: number;
    penalty: number;
    roll: number;
    total: number;
}

export interface TacticalCharacterRoundSearchCriteria {
    gameId?: string;
    tacticalCharacterId?: string;
    round?: number;
    hasInitiative?: boolean;
    actionPointsMin?: number;
    actionPointsMax?: number;
    createdBefore?: Date;
    createdAfter?: Date;
    limit?: number;
    offset?: number;
}
