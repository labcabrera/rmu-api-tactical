const mongoose = require('mongoose');

const tacticalCharacterAction = new mongoose.Schema({
    actionType: String,
    phaseStart: Number,
    phaseEnd: Number
});

const tacticalCharacterRoundSchema = new mongoose.Schema({
    tacticalCharacterId: {
        type: String,
        required: true
    },
    round: {
        type: Number,
        required: true
    },
    initiative: {
        type: Number,
        required: false
    },
    actions: [tacticalCharacterAction]
}, {
    timestamps: true,
    collection: "tactical-character-rounds"
});

const TacticalCharacterRound = mongoose.model('TacticalCharacterRounds', tacticalCharacterRoundSchema);

module.exports = TacticalCharacterRound;