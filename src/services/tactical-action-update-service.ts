import tacticalActionConverter from '../converters/tactical-action-converter';
import TacticalActionDocument from '../models/tactical-action-model';
import attackService from './attack/attack-service';

const prepare = async (actionId: string, requestBody: any): Promise<any> => {
    const action = await TacticalActionDocument.findById(actionId);
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

export default {
    prepare
};
