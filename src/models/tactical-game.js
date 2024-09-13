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
    description: {
        type: String,
        required: false
    }
}, { timestamps: true });

const TacticalGame = mongoose.model('TacticalGame', tacticalGameSchema);

module.exports = TacticalGame;