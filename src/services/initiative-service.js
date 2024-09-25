const TacticalCharacterRound = require('../models/tactical-character-round-model');
const tacticalCharacterGameConverter = require('../converters/tactical-character-round-converter');

const updateInitiative = async (tacticalCharacterRoundId, initiativeRoll) => {
    const characterRound = await TacticalCharacterRound.findById(tacticalCharacterRoundId);
    if (!characterRound) {
        throw { status: 404, message: 'Tactical character round not found' }
    }
    const base = characterRound.initiative.base ? characterRound.initiative.base : 0;
    const penalty = characterRound.initiative.penalty ? characterRound.initiative.penalty : 0;
    const total = base + penalty + initiativeRoll;
    const update = {
        initiative: {
            base: base,
            penalty: penalty,
            roll: initiativeRoll,
            total: total
        }
    };
    const updated = await TacticalCharacterRound.findByIdAndUpdate(tacticalCharacterRoundId, update, { new: true });
    if (!updated) {
        throw { status: 404, message: 'Tactical character round not found' };
    };
    return tacticalCharacterGameConverter.toJSON(updated);
};

module.exports = {
    updateInitiative
};