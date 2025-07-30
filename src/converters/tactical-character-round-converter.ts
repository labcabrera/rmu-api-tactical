import { TacticalCharacterRoundModel } from '../types';

const toJSON = (tacticalCharacterRound: TacticalCharacterRoundModel) => {
    return {
        id: tacticalCharacterRound._id,
        tacticalGameId: tacticalCharacterRound.gameId,
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
