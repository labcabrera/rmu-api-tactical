const mongoose = require('mongoose');

const tacticalActionSchema = new mongoose.Schema({
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
    type: {
        type: String,
        required: true
    },
    phaseStart: {
        type: Number,
        required: true
    },
    actionPoints: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: false
    }
}, {
    timestamps: true,
    collection: "tactical-actions"
});

const TacticalAction = mongoose.model('TacticalAction', tacticalActionSchema);

module.exports = TacticalAction;