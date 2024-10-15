const TacticalCharacter = require('../../models/tactical-character-model');
const TacticalAction = require('../../models/tactical-action-model');

const attackerBonusProcessor = require('./attacker-bonus-processor');
const defenderBonusProcessor = require('./defender-bonus-processor');

const prepare = async (action) => {
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

module.exports = {
    prepare
};