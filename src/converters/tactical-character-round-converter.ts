import { ITacticalCharacterRound } from '../types';

const toJSON = (tacticalCharacterRound: ITacticalCharacterRound) => {
    return {
        id: tacticalCharacterRound._id,
        tacticalGameId: tacticalCharacterRound.tacticalGameId,
        round: tacticalCharacterRound.round,
        tacticalCharacterId: tacticalCharacterRound.tacticalCharacterId,
        initiative: tacticalCharacterRound.initiative,
        actionPoints: tacticalCharacterRound.actionPoints,
        createdAt: tacticalCharacterRound.createdAt,
        updatedAt: tacticalCharacterRound.updatedAt,
    };
};

export default {
    toJSON
};
