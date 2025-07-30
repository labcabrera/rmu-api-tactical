import tacticalCharacterConverter from '../converters/tactical-character-converter';
import TacticalCharacter from "../models/tactical-character-model";
import TacticalGame from "../models/tactical-game-model";
import { IApiError, IPaginatedResponse, ITacticalCharacter, ITacticalGame } from '../types';

interface CharacterData {
    tacticalGameId: string;
    faction?: string;
    name: string;
    info?: {
        race: string;
        level?: number;
    };
    endurance?: {
        max: number;
    };
    hp?: {
        max: number;
    };
    statistics?: any;
    skills?: any;
}

const findById = async (characterId: string): Promise<any> => {
    const readed: ITacticalCharacter | null = await TacticalCharacter.findById(characterId);
    if (!readed) {
        const error: IApiError = new Error('Tactical character not found');
        error.status = 404;
        throw error;
    }
    return tacticalCharacterConverter.toJSON(readed);
};

const find = async (searchExpression?: string, tacticalGameId?: string, page: number = 0, size: number = 10): Promise<IPaginatedResponse<any>> => {
    let filter: any = {};
    if (tacticalGameId) {
        filter.gameId = tacticalGameId;
    }
    const skip = page * size;
    const list: ITacticalCharacter[] = await TacticalCharacter.find(filter).skip(skip).limit(size).sort({ updatedAt: -1 });
    const count = await TacticalCharacter.countDocuments(filter);
    const content = list.map(tacticalCharacterConverter.toJSON);
    const totalPages = Math.ceil(count / size);

    return {
        content: content,
        page: page,
        size: size,
        total: count,
        totalPages: totalPages
    };
};

const insert = async (user: string, data: CharacterData): Promise<any> => {
    const tacticalGame: ITacticalGame | null = await TacticalGame.findById(data.tacticalGameId);
    if (!tacticalGame) {
        const error: IApiError = new Error("Tactical game not found");
        error.status = 400;
        throw error;
    }

    if (!data.faction) {
        const error: IApiError = new Error("Required faction");
        error.status = 400;
        throw error;
    }

    if (!tacticalGame.factions.includes(data.faction)) {
        const error: IApiError = new Error("Invalid faction");
        error.status = 400;
        throw error;
    }

    if (!data.info || !data.info.race) {
        const error: IApiError = new Error('Required race');
        error.status = 400;
        throw error;
    }

    if (!data.endurance || !data.endurance.max) {
        const error: IApiError = new Error('Required endurance');
        error.status = 400;
        throw error;
    }

    if (!data.hp || !data.hp.max) {
        const error: IApiError = new Error('Required HP');
        error.status = 400;
        throw error;
    }

    const newCharacter = new TacticalCharacter({
        gameId: data.tacticalGameId,
        name: data.name,
        faction: data.faction,
        maxHitPoints: data.hp.max,
        hitPoints: data.hp.max,
        skills: data.skills || [],
        equipment: []
    });

    const savedCharacter = await newCharacter.save();
    return tacticalCharacterConverter.toJSON(savedCharacter);
};

const update = async (characterId: string, data: Partial<CharacterData>): Promise<any> => {
    const updatedCharacter = await TacticalCharacter.findByIdAndUpdate(characterId, data, { new: true });
    if (!updatedCharacter) {
        const error: IApiError = new Error('Tactical character not found');
        error.status = 404;
        throw error;
    }
    return tacticalCharacterConverter.toJSON(updatedCharacter);
};

const deleteById = async (characterId: string): Promise<void> => {
    const deletedCharacter = await TacticalCharacter.findByIdAndDelete(characterId);
    if (!deletedCharacter) {
        const error: IApiError = new Error('Tactical character not found');
        error.status = 404;
        throw error;
    }
};

export default {
    findById,
    find,
    insert,
    update,
    deleteById
};
