const mongoose = require('mongoose');

const tacticalCharacterAction = new mongoose.Schema({
    actionType: String,
    phaseStart: Number,
    phaseEnd: Number
});

const tacticalCharacterRoundInitiativeSchema = new mongoose.Schema({
    base: Number,
    penalty: Number,
    roll: Number,
    total: Number
}, { _id: false });

const tacticalCharacterRoundSchema = new mongoose.Schema({
    tacticalGameId: {
        type: String,
        required: true
    },
    round: {
        type: Number,
        required: true
    },
    tacticalCharacterId: {
        type: String,
        required: true
    },
    initiative: {
        type: tacticalCharacterRoundInitiativeSchema,
        required: true
    },
    actionPoints: {
        type: Number,
        required: true
    }
}, {
    timestamps: true,
    collection: "tactical-character-rounds"
});

const TacticalCharacterRound = mongoose.model('TacticalCharacterRounds', tacticalCharacterRoundSchema);

module.exports = TacticalCharacterRound;