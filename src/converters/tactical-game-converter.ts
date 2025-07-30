import { ITacticalGame } from '../types';

interface TacticalGameResponse {
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

const toJSON = (tacticalGame: ITacticalGame): TacticalGameResponse => {
    const result: TacticalGameResponse = {
        id: (tacticalGame._id as any).toString(),
        name: tacticalGame.name,
        round: tacticalGame.round,
        factions: tacticalGame.factions,
        user: tacticalGame.user
    };

    if (tacticalGame.status) result.status = tacticalGame.status;
    if (tacticalGame.phase) result.phase = tacticalGame.phase;
    if (tacticalGame.description) result.description = tacticalGame.description;
    if (tacticalGame.createdAt) result.createdAt = tacticalGame.createdAt;
    if (tacticalGame.updatedAt) result.updatedAt = tacticalGame.updatedAt;

    return result;
};

export default {
    toJSON
};
