const TacticalAction = require('../models/tactical-action-model');

const tacticalActionConverter = require('../converters/tactical-action-converter');
const attackService = require('./attack/attack-service');

const update = async (id, data) => {
    const action = await TacticalAction.findById(id);
    if (!action) {
        throw { status: 404, message: 'Tactical action not found' };
    }
    switch (action.type) {
        case 'attack':
            await attackService.prepare(action);
            break;
        default:
            throw { status: 400, message: 'Tactical action type not supported' };
    }
    return tacticalActionConverter.toJSON(action);
};

module.exports = {
    update
};