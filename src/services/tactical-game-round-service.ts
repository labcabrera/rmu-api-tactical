import TacticalGamePhase from '../constants/tactical-game-phase';
import { TacticalGame } from '../domain/entities/tactical-game.entity';
import TacticalCharacterDocument from '../models/tactical-character-model';
import TacticalCharacterRoundDocument from '../models/tactical-character-round-model';
import TacticalGameModel from '../models/tactical-game-model';
import { TacticalCharacterModel, TacticalCharacterRoundModel } from '../types';

const startRound = async (gameId: string): Promise<any> => {
    const tacticalGame: TacticalGame = await TacticalGameModel.findById(gameId);
    const characters = await TacticalCharacterDocument.find({ gameId: gameId });
    if (!tacticalGame) {
        throw { state: 400, message: 'Tactical game not found' };
    }
    if (characters.length < 1) {
        throw { state: 400, message: 'No characters associated with the tactical game have been defined' };
    }

    const newRound = tacticalGame.round + 1;
    const update = {
        status: 'started',
        round: newRound,
        phase: TacticalGamePhase.INITIATIVE
    };
    const updatedGame = await TacticalGameModel.findByIdAndUpdate(gameId, update, { new: true });
    if (!updatedGame) {
        throw { status: 404, message: 'Tactical game not found' };
    }
    characters.map(c => { createTacticalCharacterRound(c, newRound) });
    return tacticalGameConverter.toJSON(updatedGame);
};

const findTacticalCharacterRounds = async (gameId: string, round: number): Promise<any[]> => {
    const list = await TacticalCharacterRoundDocument.find({ gameId: gameId, round: round });
    return list.map(tacticalCharacterRoundConverter.toJSON);
};

const createTacticalCharacterRound = async (character: TacticalCharacterModel, round: number): Promise<TacticalCharacterRoundModel> => {
    let baseInitiative = 0;
    if (character.initiative && (character.initiative as any).base) {
        baseInitiative = (character.initiative as any).base;
    }
    const newCharacterRound = new TacticalCharacterRoundDocument({
        gameId: (character as any).gameId,
        round: round,
        tacticalCharacterId: character.id,
        initiative: {
            base: baseInitiative,
            penalty: 0,
            roll: 0,
            total: baseInitiative
        },
        actionPoints: 4
    } as TacticalCharacterRoundModel);
    const savedCharacterRound = await newCharacterRound.save();
    return savedCharacterRound;
};

export default {
    startRound,
    findTacticalCharacterRounds
};
