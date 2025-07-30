import { TacticalActionModel } from '../types';
import { TacticalActionDTO } from '../types/dto';

export const toJSON = (tacticalAction: TacticalActionModel): TacticalActionDTO => {
    const result: TacticalActionDTO = {
        id: (tacticalAction._id as any).toString(),
        tacticalGameId: tacticalAction.tacticalGameId,
        round: tacticalAction.round,
        tacticalCharacterId: tacticalAction.tacticalCharacterId,
        type: tacticalAction.type
    };

    if (tacticalAction.phaseStart) result.phaseStart = tacticalAction.phaseStart;
    if (tacticalAction.actionPoints) result.actionPoints = tacticalAction.actionPoints;
    if (tacticalAction.attackInfo) result.attackInfo = tacticalAction.attackInfo;
    if (tacticalAction.attacks) result.attacks = tacticalAction.attacks;
    if (tacticalAction.description) result.description = tacticalAction.description;
    if (tacticalAction.result) result.result = tacticalAction.result;
    if (tacticalAction.createdAt) result.createdAt = tacticalAction.createdAt;
    if (tacticalAction.updatedAt) result.updatedAt = tacticalAction.updatedAt;

    return result;
};

const tacticalActionConverter = {
    toJSON
};

export default tacticalActionConverter;
