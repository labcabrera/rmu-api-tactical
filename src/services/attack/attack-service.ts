import TacticalCharacter from '../../models/tactical-character-model';
import TacticalAction from '../../models/tactical-action-model';
import { ITacticalCharacter, ITacticalAction, IApiError } from '../../types';

interface AttackData {
    attackMode?: string;
    attackRoll?: number;
    [key: string]: any;
}

interface AttackInfo {
    status: string;
    mode: string;
    targetId: string;
    attackerBonusModifiers: any[];
    defenderBonusModifiers: any[];
    attackBonusModifiers: any[];
}

const update = async (action: ITacticalAction, data: AttackData): Promise<ITacticalAction> => {
    const character: ITacticalCharacter | null = await TacticalCharacter.findById(action.characterId);
    if (!character) {
        const error: IApiError = new Error('Tactical character not found');
        error.status = 404;
        throw error;
    }
    
    action.result = action.result || {};
    action.result.attacks = {};
    
    if (action.result.attackInfo?.attacks?.mainHand) {
        action.result.attacks.mainHand = await createMainHandAttack(action, character);
    }
    
    await TacticalAction.updateOne({ _id: action._id }, action);
    return action;
};

const prepare = async (action: ITacticalAction, requestBody: AttackData): Promise<ITacticalAction> => {
    console.log('Preparing attack action:', { actionId: action._id, requestBody });
    return await update(action, requestBody);
};

const updateAttackRoll = async (actionId: string, requestBody: AttackData): Promise<ITacticalAction> => {
    console.log('Updating attack roll for action:', { actionId, requestBody });
    
    const action: ITacticalAction | null = await TacticalAction.findById(actionId);
    if (!action) {
        const error: IApiError = new Error('Action not found');
        error.status = 404;
        throw error;
    }
    
    const attackMode: string = requestBody.attackMode || 'mainHand';
    const attackRoll: number | undefined = requestBody.attackRoll;
    
    action.result = action.result || {};
    action.result.attacks = action.result.attacks || {};
    action.result.attacks[attackMode] = action.result.attacks[attackMode] || {};
    action.result.attacks[attackMode].foo = 'foo';

    await TacticalAction.updateOne({ _id: action._id }, action);
    return action;
};

const createMainHandAttack = async (action: ITacticalAction, character: ITacticalCharacter): Promise<AttackInfo> => {
    const attack: AttackInfo = {
        status: 'pending',
        mode: 'mainHand',
        targetId: action.result?.attackInfo?.mainTargetId || '',
        attackerBonusModifiers: [],
        defenderBonusModifiers: [],
        attackBonusModifiers: [],
    };
    return attack;
};

export default {
    update,
    prepare,
    updateAttackRoll
};
