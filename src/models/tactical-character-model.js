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
    height: {
        type: Number,
        required: false
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
    },
    quicknessDefensiveBonus: {
        type: Number,
        required: false
    },
    passiveDodge: {
        type: Number,
        required: false
    },
    fullDodge: {
        type: Number,
        required: false
    },
    passiveBlock: {
        type: Number,
        required: false
    }
}, { _id: false });

const characterInitiativeSchema = new mongoose.Schema({
    base: Number
}, { _id: false });

const characterSkillSchema = new mongoose.Schema({
    skillCategoryId: {
        type: String,
        required: true
    },
    skillId: {
        type: String,
        required: true
    },
    attributeBonus: {
        type: Number,
        required: true
    },
    racialBonus: {
        type: Number,
        required: true
    },
    developmentBonus: {
        type: Number,
        required: true
    },
    customBonus: {
        type: Number,
        required: true
    },
    totalBonus: {
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

const characterItemArmorSchema = new mongoose.Schema({
    slot: String,
    armorType: Number,
    enc: Number,
    maneuver: Number,
    rangedPenalty: Number,
    perception: Number
}, { _id: false });

const enduranceInfoSchema = new mongoose.Schema({
    max: Number,
    current: Number
}, { _id: false });

const powerInfoSchema = new mongoose.Schema({
    max: Number,
    current: Number
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
    armor: characterItemArmorSchema,
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
    endurance: enduranceInfoSchema,
    power: powerInfoSchema,
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