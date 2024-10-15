const mongoose = require('mongoose');

const tacticalActionAttackModifier = new mongoose.Schema({
    type: {
        type: String,
        required: true
    },
    value: {
        type: Number,
        required: true
    }
}, { _id: false });

const tacticalActionAttak = new mongoose.Schema({
    type: {
        type: String,
        required: true
    },
    targetId: {
        type: String,
        required: true
    },
    attackerBonusModifiers: [tacticalActionAttackModifier],
    defenderBonusModifiers: [tacticalActionAttackModifier],
    attackBonusModifiers: [tacticalActionAttackModifier],
    totalAttackerBonus: {
        type: Number,
        required: true
    },
    totalDefenderBonus: {
        type: Number,
        required: true
    },
    totalAttackBonus: {
        type: Number,
        required: true
    },
    totalBonus: {
        type: Number,
        required: true
    }
}, { _id: false });


const tacticalActionAttackInfoSchema = new mongoose.Schema({
    selectedWeapon: {
        type: String,
        required: true
    },
    parry: {
        type: Number,
        required: true
    },
    restrictedQuarters: {
        type: String,
        required: true
    },
    chargeSpeed: {
        type: String,
        required: true
    },
}, { _id: false });

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
    attackInfo: tacticalActionAttackInfoSchema,
    attacks: [tacticalActionAttak],
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