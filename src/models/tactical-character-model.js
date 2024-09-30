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
    },
    weight: {
        type: Number,
        required: false
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

const characterItemWeaponSchema = new mongoose.Schema({
    type: String,
    attackTable: String,
    skillId: String,
    fumble: Number,
    sizeAdjustment: Number
}, { _id: false });

const characterItemRangeSchema = new mongoose.Schema({
    from: Number,
    to: Number,
    bonus: Number
}, { _id: false });

const characterItemInfoSchema = new mongoose.Schema({
    length: Number,
    strength: Number,
    weight: Number,
    productionTime: Number
}, { _id: false });

const characterItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    itemTypeId: {
      type: String,
      required: true  
    },
    category: {
        type: String,
        required: true
    },
    weapon: characterItemWeaponSchema,
    weaponRange: [characterItemRangeSchema],
    info: characterItemInfoSchema
});

const characterEquipment = new mongoose.Schema({
    mainHand: String,
    offHand: String,
    body: String,
    head: String,
    weight: Number
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