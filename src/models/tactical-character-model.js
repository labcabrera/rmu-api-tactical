const mongoose = require('mongoose');

const characterInfoSchema = new mongoose.Schema({
    level: {
        type: Number,
        required: true
    },
    race: {
        type: String,
        required: true
    },
    sizeId: {
        type: String,
        required: true
    },
    armorType: {
        type: Number,
        required: true
    }
});

const characterInitiativeSchema = new mongoose.Schema({
    base: Number
});

const characterSkillSchema = new mongoose.Schema({
    skillId: {
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
    category: String,
    itemTypeId: String,
    attackTable: String,
    skillId: String
});

const characterEquipment = new mongoose.Schema({
    mainHand: String,
    offHand: String,
    body: String,
    head: String
});

const characterEffectSchema = new mongoose.Schema({
    type: String,
    value: Number,
    rounds: Number
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
    faction: {
        type: String,
        required: true
    },
    info: characterInfoSchema,
    hp: {
        max: Number,
        current: Number
    },
    effects: [characterEffectSchema],
    initiative: [characterInitiativeSchema],
    skills: [characterSkillSchema],
    items: [characterItemSchema],
    equipment: {
        type: characterEquipment,
        required: false
    },
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