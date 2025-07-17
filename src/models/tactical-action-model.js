const mongoose = require('mongoose');

const attackMode = ['mainHand', 'offHand', 'dual'];

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

const tacticalAttackResult = new mongoose.Schema({
    damage: {
        type: Number,
        required: false
    }
}, { _id: false });

const tacticalActionAttak = new mongoose.Schema({
    status: {
        type: String,
        required: true
    },
    mode: {
        type: String,
        required: true,
        enum: attackMode
    },
    targetId: {
        type: String,
        required: false
    },
    range: {
        type: Number,
        required: false
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
    },
    attackRoll: {
        type: Number,
        required: false
    },
    tacticalAttackResult: tacticalAttackResult
}, { _id: false });

const tacticalAttackInfoTargetSchema = new mongoose.Schema({
    targetId: {
        type: String,
        required: true
    },
    range: {
        type: Number,
        required: false
    },
    cover: {
        type: String,
        required: false
    }
}, { _id: false });

const tacticalActionAttackInfoSchema = new mongoose.Schema({
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
    attacks: {
        mainHand: tacticalAttackInfoTargetSchema,
        offHand: tacticalAttackInfoTargetSchema
    }
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
    attacks: {
        mainHand: tacticalActionAttak,
        offHand: tacticalActionAttak,
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