const TacticalGame = require('../models/tactical-game-model');
const TacticalCharacter = require('../models/tactical-character-model');
const TacticalAction = require('../models/tactical-action-model');

const tacticalActionConverter = require('../converters/tactical-action-converter');
const attackerBonusProcessor = require('./attacker-bonus-processor');
const defenderBonusProcessor = require('./defender-bonus-processor');

const prepare = async (id) => {
    const action = await TacticalAction.findById(id);
    if (!action) {
        throw { status: 404, message: 'Tactical action not found' };
    }
    switch (action.type) {
        case 'attack':
            await prepareAttack(action);
            break;
        default:
            throw { status: 400, message: 'Tactical action type not supported' };
    }
    return tacticalActionConverter.toJSON(action);
};

const prepareAttack = async (action) => {
    const character = await TacticalCharacter.findById(action.tacticalCharacterId);
    if (!character) {
        throw { status: 404, message: 'Tactical character not found' };
    }
    const mainAttack = await createMainHandAttack(action, character);
    action.attacks = [];
    action.attacks.push(mainAttack);
    const result = TacticalAction.updateOne(action);
    return action;
};

const createMainHandAttack = async (action, character) => {
    const attack = {
        type: 'mainHand',
        attackerBonusModifiers: [],
        defenderBonusModifiers: [],
        attackBonusModifiers: [],
    };
    attackerBonusProcessor.resolveAttackerBonus(action, character, attack.attackerBonusModifiers);
    defenderBonusProcessor.resolveDefenderBonus(action, null, attack.defenderBonusModifiers);
    calculateTotalBonus(attack);
    return attack;
};

const calculateTotalBonus = (action) => {
    action.totalAttackerBonus = action.attackerBonusModifiers.reduce((sum, modifier) => { return sum + (modifier.value || 0); }, 0);
    action.totalDefenderBonus = action.defenderBonusModifiers.reduce((sum, modifier) => { return sum + (modifier.value || 0); }, 0);
    action.totalAttackBonus = action.attackBonusModifiers.reduce((sum, modifier) => { return sum + (modifier.value || 0); }, 0);
    action.totalBonus = action.totalAttackerBonus + action.totalDefenderBonus + action.totalAttackBonus;
};

const resolveActionPointsPenalty = (action) => {
    switch (action.actionPoints) {
        case 1: return -75;
        case 2: return -50;
        case 3: return -25;
        case 4: return 0;
    }
};

const resolveAttackerEffectsBonus = () => {
    const bonus = [];
    bonus.push({ type: 'todo', value: 55 });
    return bonus;
};



module.exports = {
    prepare
};