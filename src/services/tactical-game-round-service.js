const TacticalGame = require('../models/tactical-game-model');
const TacticalCharacter = require('../models/tactical-character-model');
const TacticalCharacterRound = require('../models/tactical-character-round-model');
const TacticalGamePhase = require('../constants/tactical-game-phase');
const tacticalGameService = require('../services/tactical-game-service');
const tacticalCharacterConverter = require('../converters/tactical-character-converter');

const tacticalGameConverter = require('../converters/tactical-game-converter');
const tacticalCharacterRoundConverter = require('../converters/tactical-character-round-converter');

const startRound = async (tacticalGameId) => {
    const tacticalGame = await TacticalGame.findById(tacticalGameId);
    const newRound = tacticalGame.round + 1;
    const update = {
        status: 'started',
        round: newRound,
        phase: TacticalGamePhase.INITIATIVE
    };
    const updatedGame = await TacticalGame.findByIdAndUpdate(tacticalGameId, update, { new: true });
    if (!updatedGame) {
        throw new { status: 404, message: 'Tactical game not found' };
    };
    const characters = await TacticalCharacter.find({ tacticalGameId: tacticalGameId });
    characters.map(c => { createTacticalCharacterRound(c, newRound) });
    return tacticalGameConverter.toJSON(updatedGame);
};

const findTacticalCharacterRounds = async (tacticalGameId, round) => {
    const list = await TacticalCharacterRound.find({ tacticalGameId: tacticalGameId, round: round });
    return list.map(tacticalCharacterRoundConverter.toJSON);
};

const createTacticalCharacterRound = async (character, round) => {
    var baseInitiative = 0;
    if (character.initiative && character.initiative.base) {
        baseInitiative = character.initiative.base;
    }
    const newCharacterRound = new TacticalCharacterRound({
        tacticalGameId: character.tacticalGameId,
        round: round,
        tacticalCharacterId: character.id,
        initiative: {
            base: baseInitiative,
            penalty: 0,
            roll: 0,
            total: baseInitiative
        },
        actionPoints: 4
    });
    const savedCharacterRound = await newCharacterRound.save();
    return savedCharacterRound;
};

module.exports = {
    startRound,
    findTacticalCharacterRounds
};