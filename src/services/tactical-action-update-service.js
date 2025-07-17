const TacticalAction = require('../models/tactical-action-model');

const tacticalActionConverter = require('../converters/tactical-action-converter');
const attackService = require('./attack/attack-service');

const prepare = async (actionId, requestBody) => {
    const action = await TacticalAction.findById(actionId);
    if (!action) {
        throw { status: 404, message: 'Tactical action not found' };
    }
    switch (action.type) {
        case 'attack':
            await attackService.prepare(action, requestBody);
            break;
        default:
            throw { status: 400, message: 'Tactical action type not supported' };
    }
    return tacticalActionConverter.toJSON(action);
};

module.exports = {
    prepare
};