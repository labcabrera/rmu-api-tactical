import tacticalGameConverter from '../converters/tactical-game-converter';
import TacticalGame from '../models/tactical-game-model';
import { IApiError, IPaginatedResponse, ITacticalGame } from '../types';

interface GameData {
    name: string;
    description?: string;
    factions?: string[];
}

interface GameFilter {
    username?: string;
}

const findById = async (id: string): Promise<any> => {
    const readedGame: ITacticalGame | null = await TacticalGame.findById(id);
    if (!readedGame) {
        const error: IApiError = new Error('Tactical game not found');
        error.status = 404;
        throw error;
    }
    return tacticalGameConverter.toJSON(readedGame);
};

const find = async (searchExpression?: string, username?: string, page: number = 0, size: number = 10): Promise<IPaginatedResponse<any>> => {
    let filter: GameFilter = {};
    if (username) {
        filter.username = username;
    }
    const skip: number = page * size;
    const list: ITacticalGame[] = await TacticalGame.find(filter).skip(skip).limit(size).sort({ updatedAt: -1 });
    const count: number = await TacticalGame.countDocuments(filter);
    const content = list.map(tacticalGameConverter.toJSON);

    return {
        content: content,
        page: page,
        size: size,
        total: count,
        totalPages: Math.ceil(count / size)
    };
};

const insert = async (user: string, data: GameData): Promise<any> => {
    let factions: string[] = data.factions || [];
    if (!factions || factions.length === 0) {
        factions = ['Light', 'Evil', 'Neutral'];
    }

    const newGame = new TacticalGame({
        user: user,
        name: data.name,
        description: data.description,
        status: 'created',
        factions: factions,
        round: 0
    });

    const savedGame = await newGame.save();
    return tacticalGameConverter.toJSON(savedGame);
};

const update = async (gameId: string, data: Partial<GameData>): Promise<any> => {
    const { name, description } = data;
    const updatedGame: ITacticalGame | null = await TacticalGame.findByIdAndUpdate(
        gameId,
        { name, description },
        { new: true }
    );

    if (!updatedGame) {
        const error: IApiError = new Error('Tactical game not found');
        error.status = 404;
        throw error;
    }

    return updatedGame.toJSON();
};

export default {
    findById,
    find,
    insert,
    update
};
