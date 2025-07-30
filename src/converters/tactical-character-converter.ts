import { TacticalCharacterModel } from '../types';

interface CharacterResponse {
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
    skills?: any[];
    equipment?: any[];
    createdAt?: Date;
    updatedAt?: Date;
}

const toJSON = (character: TacticalCharacterModel): CharacterResponse => {
    const result: CharacterResponse = {
        id: (character._id as any).toString(),
        gameId: character.gameId,
        name: character.name,
    };

    if (character.faction) result.faction = character.faction;
    if (character.hitPoints) result.hitPoints = character.hitPoints;
    if (character.maxHitPoints) result.maxHitPoints = character.maxHitPoints;
    if (character.initiative) result.initiative = character.initiative;
    if (character.status) result.status = character.status;
    if (character.position) result.position = character.position;
    if (character.skills) result.skills = character.skills;
    if (character.equipment) result.equipment = character.equipment;
    if (character.createdAt) result.createdAt = character.createdAt;
    if (character.updatedAt) result.updatedAt = character.updatedAt;

    return result;
};

export default {
    toJSON
};
