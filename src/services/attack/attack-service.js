const TacticalCharacter = require('../../models/tactical-character-model');
const TacticalAction = require('../../models/tactical-action-model');

const update = async (action, data) => {
    const character = await TacticalCharacter.findById(action.tacticalCharacterId);
    if (!character) {
        throw { status: 404, message: 'Tactical character not found' };
    }
    action.attacks = {};
    if (action.attackInfo.attacks.mainHand) {
        action.attacks.mainHand = await createMainHandAttack(action, character);
    }
    return await TacticalAction.updateOne(action);
};

const prepare = async (action, requestBody) => {
    console.log('Preparing attack action:', { actionId: action._id, requestBody });
    return await update(action, requestBody);
};

const updateAttackRoll = async (actionId, requestBody) => {
    console.log('Updating attack roll for action:', { actionId, requestBody });
    const action = await TacticalAction.findById(actionId);
    if (!action) {
        throw { status: 404, message: 'Action not found' };
    }
    const attackMode = requestBody.attackMode || 'mainHand';
    const attackRoll = requestBody.attackRoll;
    action.attacks[attackMode].foo = 'foo';

    //action.attackInfo = { ...action.attackInfo, ...requestBody };
    return await TacticalAction.updateOne(action);
};

const createMainHandAttack = async (action, character) => {
    const attack = {
        status: 'pending',
        mode: 'mainHand',
        targetId: action.attackInfo.mainTargetId,
        attackerBonusModifiers: [],
        defenderBonusModifiers: [],
        attackBonusModifiers: [],
    };
    return attack;
};

module.exports = {
    update,
    prepare,
    updateAttackRoll
};