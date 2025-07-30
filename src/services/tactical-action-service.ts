import TacticalAction from '../models/tactical-action-model';
import TacticalCharacter from '../models/tactical-character-model';
import TacticalGame from '../models/tactical-game-model';
import { IApiError, IPaginatedResponse, ITacticalAction, ITacticalCharacter, ITacticalGame } from '../types';

interface ActionData {
    gameId: string;
    characterId: string;
    actionType: string;
    round?: number;
    description?: string;
    target?: string;
    result?: any;
}

const findById = async (id: string): Promise<any> => {
    const action: ITacticalAction | null = await TacticalAction.findById(id);
    if (!action) {
        const error: IApiError = new Error('Tactical action not found');
        error.status = 404;
        throw error;
    }
    return action.toJSON();
};

const find = async (tacticalGameId?: string, tacticalCharacterId?: string, round?: string, page: number = 0, size: number = 10): Promise<IPaginatedResponse<any>> => {
    let filter: any = {};
    if (tacticalGameId) {
        filter.gameId = tacticalGameId;
    }
    if (tacticalCharacterId) {
        filter.characterId = tacticalCharacterId;
    }
    if (round) {
        filter.round = parseInt(round);
    }
    const skip = page * size;
    const list: ITacticalAction[] = await TacticalAction.find(filter).skip(skip).limit(size).sort({ updatedAt: -1 });
    const count = await TacticalAction.countDocuments(filter);
    const content = list.map(action => action.toJSON());
    const totalPages = Math.ceil(count / size);

    return {
        content: content,
        page: page,
        size: size,
        total: count,
        totalPages: totalPages
    };
};

const insert = async (data: ActionData): Promise<any> => {
    if (!data.gameId) {
        const error: IApiError = new Error('Game ID is required');
        error.status = 400;
        throw error;
    }

    if (!data.characterId) {
        const error: IApiError = new Error('Character ID is required');
        error.status = 400;
        throw error;
    }

    if (!data.actionType) {
        const error: IApiError = new Error('Action type is required');
        error.status = 400;
        throw error;
    }

    const tacticalGame: ITacticalGame | null = await TacticalGame.findById(data.gameId);
    if (!tacticalGame) {
        const error: IApiError = new Error('Tactical game not found');
        error.status = 404;
        throw error;
    }

    const tacticalCharacter: ITacticalCharacter | null = await TacticalCharacter.findById(data.characterId);
    if (!tacticalCharacter) {
        const error: IApiError = new Error('Tactical character not found');
        error.status = 404;
        throw error;
    }

    const round = data.round || tacticalGame.round;
    const description = data.description || `${tacticalCharacter.name} > ${data.actionType}`;

    const newAction = new TacticalAction({
        gameId: data.gameId,
        characterId: data.characterId,
        actionType: data.actionType,
        round: round,
        description: description,
        target: data.target,
        result: data.result,
        status: 'pending'
    });

    const savedAction = await newAction.save();
    return savedAction.toJSON();
};

const update = async (actionId: string, data: Partial<ActionData>): Promise<any> => {
    const updatedAction = await TacticalAction.findByIdAndUpdate(actionId, data, { new: true });
    if (!updatedAction) {
        const error: IApiError = new Error('Tactical action not found');
        error.status = 404;
        throw error;
    }
    return updatedAction.toJSON();
};

const deleteById = async (actionId: string): Promise<void> => {
    const deletedAction = await TacticalAction.findByIdAndDelete(actionId);
    if (!deletedAction) {
        const error: IApiError = new Error('Tactical action not found');
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
