const toJSON = (tacticalAction) => {
    return {
        id: tacticalAction._id,
        tacticalGameId: tacticalAction.tacticalGameId,
        round: tacticalAction.round,
        tacticalCharacterId: tacticalAction.tacticalCharacterId,
        type: tacticalAction.type,
        phaseStart: tacticalAction.phaseStart,
        actionPoints: tacticalAction.actionPoints,
        attackInfo: tacticalAction.attackInfo,
        attacks: tacticalAction.attacks,
        description: tacticalAction.description,
        createdAt: tacticalAction.createdAt,
        updatedAt: tacticalAction.updatedAt
    };
};

module.exports = {
    toJSON
};