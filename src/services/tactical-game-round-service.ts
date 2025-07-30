import TacticalGamePhase from '../constants/tactical-game-phase';
import tacticalCharacterRoundConverter from '../converters/tactical-character-round-converter';
import tacticalGameConverter from '../converters/tactical-game-converter';
import TacticalCharacter from '../models/tactical-character-model';
import TacticalCharacterRound from '../models/tactical-character-round-model';
import TacticalGame from '../models/tactical-game-model';
import { ITacticalCharacter, ITacticalCharacterRound } from '../types';

const startRound = async (tacticalGameId: string): Promise<any> => {
    const tacticalGame = await TacticalGame.findById(tacticalGameId);
    const characters = await TacticalCharacter.find({ tacticalGameId: tacticalGameId });
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
    const updatedGame = await TacticalGame.findByIdAndUpdate(tacticalGameId, update, { new: true });
    if (!updatedGame) {
        throw { status: 404, message: 'Tactical game not found' };
    }
    characters.map(c => { createTacticalCharacterRound(c, newRound) });
    return tacticalGameConverter.toJSON(updatedGame);
};

const findTacticalCharacterRounds = async (tacticalGameId: string, round: number): Promise<any[]> => {
    const list = await TacticalCharacterRound.find({ tacticalGameId: tacticalGameId, round: round });
    return list.map(tacticalCharacterRoundConverter.toJSON);
};

const createTacticalCharacterRound = async (character: ITacticalCharacter, round: number): Promise<ITacticalCharacterRound> => {
    let baseInitiative = 0;
    if (character.initiative && (character.initiative as any).base) {
        baseInitiative = (character.initiative as any).base;
    }
    const newCharacterRound = new TacticalCharacterRound({
        tacticalGameId: (character as any).tacticalGameId,
        round: round,
        tacticalCharacterId: character.id,
        initiative: {
            base: baseInitiative,
            penalty: 0,
            roll: 0,
            total: baseInitiative
        },
        actionPoints: 4
    } as ITacticalCharacterRound);
    const savedCharacterRound = await newCharacterRound.save();
    return savedCharacterRound;
};

export default {
    startRound,
    findTacticalCharacterRounds
};
