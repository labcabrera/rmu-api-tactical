const mongoose = require('mongoose');

const characterStatSchema = new mongoose.Schema({
    bonus: {
        type: Number,
        required: true,
    },
    racial: {
        type: Number,
        required: true,
    },
    custom: {
        type: Number,
        required: true,
    },
    totalBonus: {
        type: Number,
        required: true,
    },
}, { _id: false });

const characterStatisticsSchema = new mongoose.Schema({
    ag: characterStatSchema,
    co: characterStatSchema,
    em: characterStatSchema,
    in: characterStatSchema,
    me: characterStatSchema,
    pr: characterStatSchema,
    qu: characterStatSchema,
    re: characterStatSchema,
    sd: characterStatSchema,
    st: characterStatSchema,
}, { _id: false });

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
    baseBonus: Number,
    customBonus: Number,
    totalBonus: {
        type: Number,
        required: true
    }
}, { _id: false });

const characterSkillSchema = new mongoose.Schema({
    skillId: {
        type: String,
        required: true
    },
    specialization: {
        type: String,
        required: false,
    },
    statistics: [String],
    ranks: {
        type: Number,
        required: false,
    },
    statBonus: {
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
}, { _id: false });

const characterItemWeaponSchema = new mongoose.Schema({
    attackTable: {
        type: String,
        required: true
    },
    skillId: {
        type: String,
        required: true
    },
    fumble: {
        type: Number,
        required: true
    },
    sizeAdjustment: {
        type: Number,
        required: true
    },
    requiredHands: {
        type: Number,
        required: true
    },
    throwable: {
        type: Boolean,
        required: true
    }
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
    slot: {
        type: String,
        required: true,
    },
    armorType: {
        type: Number,
        required: true,
    },
    enc: {
        type: Number,
        required: true,
    },
    maneuver: {
        type: Number,
        required: true,
    },
    rangedPenalty: {
        type: Number,
        required: true,
    },
    perception: {
        type: Number,
        required: true
    }
}, { _id: false });

const enduranceSchema = new mongoose.Schema({
    max: {
        type: Number,
        required: true
    },
    current: {
        type: Number,
        required: true
    },
    accumulator: {
        type: Number,
        required: true
    },
    fatiguePenalty: {
        type: Number,
        required: true
    }
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

const characterMovementSchema = new mongoose.Schema({
    baseMovementRate: {
        type: Number,
        required: true
    },
    strideRacialBonus: {
        type: Number,
        required: true
    },
    strideCustomBonus: {
        type: Number,
        required: true
    }
}, { _id: false });

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

const tacticalCharacterAttackSchema = new mongoose.Schema({
    bo: {
        type: Number,
        required: true
    },
    attackTable: {
        type: String,
        required: true
    }
}, { _id: false });

const tacticalCharacterAttacksSchema = new mongoose.Schema({
    mainHand: tacticalCharacterAttackSchema,
    offHand: tacticalCharacterAttackSchema,
}, { _id: false });

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
    statistics: characterStatisticsSchema,
    movement: characterMovementSchema,
    defense: characterDefenseSchema,
    hp: {
        max: Number,
        current: Number
    },
    endurance: enduranceSchema,
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
    attacks: tacticalCharacterAttacksSchema,
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