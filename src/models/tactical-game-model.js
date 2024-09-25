const mongoose = require('mongoose');

const tacticalGameSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    user: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: false
    },
    round: {
        type: Number,
        required: true
    },
    phase: {
        type: String,
        required: false
    },
    factions: [String],
    description: {
        type: String,
        required: false
    }
}, {
    timestamps: true,
    collection: "tactical-games"
});

const TacticalGame = mongoose.model('TacticalGame', tacticalGameSchema);

module.exports = TacticalGame;