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
    baseMovementRate: {
        type: Number,
        required: true
    }
}, { _id: false });

const characterDefenseSchema = new mongoose.Schema({
    armorType: {
        type: Number,
        required: true
    },
    defensiveBonus: {
        type: Number,
        required: true
    }
}, { _id: false });

const characterInitiativeSchema = new mongoose.Schema({
    base: Number
}, { _id: false });

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
    itemTypeId: {
      type: String,
      required: true  
    },
    category: {
        type: String,
        required: true
    },
    weaponRange: {
        type: String,
        required: false,
    },
    weaponType: {
        type: String,
        required: false
    },
    attackTable: {
        type: String,
        required: false
    },
    skillId: {
        type: String,
        required: false
    }
});

const characterEquipment = new mongoose.Schema({
    mainHand: String,
    offHand: String,
    body: String,
    head: String
}, { _id: false });

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
    defense: characterDefenseSchema,
    hp: {
        max: Number,
        current: Number
    },
    effects: [characterEffectSchema],
    initiative: {
        type: characterInitiativeSchema,
        required: true
    },
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