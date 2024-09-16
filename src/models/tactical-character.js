const mongoose = require('mongoose');

const characterSkillSchema = new mongoose.Schema({
    skill: {
        type: String,
        required: true
    },
    bonus: {
        type: Number,
        required: true
    }
});

const characterItemSchema = new mongoose.Schema({
    name: String,
    type: String,
    attackTable: String,
    skill: String
});

const characterEquipment = new mongoose.Schema({
    mainHand: String,
    offHand: String,
    body: String,
    head: String
});

const tacticalCharacterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    tacticalGameId: {
        type: String,
        required: true
    },
    level: {
        type: Number,
        required: true
    },
    race: {
        type: String,
        required: true
    },
    size: {
        type: String,
        required: true
    },
    armorType: {
        type: Number,
        required: true
    },
    hp: {
        current: Number,
        max: Number
    },
    skills: [characterSkillSchema],
    items: [characterItemSchema],
    equipment: characterEquipment,
    description: {
        type: String,
        required: false
    }
}, {
    timestamps: true,
    collection: "tactical-characters"
});

const TacticalCharacter = mongoose.model('TacticalCharacter', tacticalCharacterSchema);

module.exports = TacticalCharacter;