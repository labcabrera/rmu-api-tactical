import TacticalCharacterRoundDocument from '../models/tactical-character-round-model';
import { IApiError, ICharacterRound } from '../types';

const updateInitiative = async (tacticalCharacterRoundId: string, initiativeRoll: number): Promise<any> => {
    const characterRound: ICharacterRound | null = await TacticalCharacterRoundDocument.findById(tacticalCharacterRoundId);
    if (!characterRound) {
        const error: IApiError = new Error('Tactical character round not found');
        error.status = 404;
        throw error;
    }

    const base = characterRound.initiative || 0;
    const total = base + initiativeRoll;

    characterRound.initiative = total;
    const updated = await characterRound.save();

    return updated.toJSON();
};

export default {
    updateInitiative
};
