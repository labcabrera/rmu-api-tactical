const TacticalGame = require('../models/tactical-game-model');
const TacticalCharacter = require('../models/tactical-character-model');
const TacticalAction = require('../models/tactical-action-model');

const tacticalActionConverter = require('../converters/tactical-action-converter');

const findById = async (id) => {
    const action = await TacticalAction.findById(id);
    return tacticalActionConverter.toJSON(handleNotFoundError(action, 'Tactical action not found'));
};

const find = async (tacticalGameId, tacticalCharacterId, round, page, size) => {
    let filter = {};
    if (tacticalGameId) {
        filter.tacticalGameId = tacticalGameId;
    }
    if (tacticalCharacterId) {
        filter.tacticalCharacterId = tacticalCharacterId;
    }
    if (round) {
        filter.round = round;
    }
    const skip = page * size;
    const list = await TacticalAction.find(filter).skip(skip).limit(size).sort({ updatedAt: -1 });
    const count = await TacticalAction.countDocuments(filter);
    const content = list.map(tacticalActionConverter.toJSON);
    return { content: content, pagination: { page: page, size: size, totalElements: count } };
};

const insert = async (data) => {
    validateActionData(data);
    const tacticalGame = await fetchExistingTacticalGame(data.tacticalGameId);
    const tacticalCharacter = await fetchExistingCharacter(data.tacticalCharacterId);
    const round = data.round || tacticalGame.round;
    const description = data.description || tacticalCharacter.name + " > " + data.type;
    const newAction = new TacticalAction({
        tacticalGameId: data.tacticalGameId,
        round: round,
        tacticalCharacterId: data.tacticalCharacterId,
        type: data.type,
        phaseStart: data.phaseStart,
        actionPoints: data.actionPoints,
        attackInfo: data.attackInfo,
        description: description,
    });
    const savedAction = await newAction.save();
    return tacticalActionConverter.toJSON(savedAction);
};

const update = async (actionId, data) => {
    const { description } = data;
    const updatedAction = await TacticalAction.findByIdAndUpdate(actionId, { description }, { new: true });
    if (!updatedAction) {
        throw { status: 404, message: 'Tactical action not found' };
    };
    return tacticalActionConverter.toJSON(updatedAction);
};

const deleteById = async (actionId) => {
    const deletedAction = await TacticalAction.findByIdAndDelete(actionId);
    if (!deletedAction) {
        throw { status: 404, message: 'Tactical action not found' };
    }
};

const fetchExistingTacticalGame = async (tacticalGameId) => {
    if (!tacticalGameId) {
        throw { status: 404, message: 'Required tactical game identifier' };
    }
    try {
        const tacticalGame = await TacticalGame.findById(tacticalGameId);
        return handleNotFoundError(tacticalGame, 'Invalid tactical game');
    } catch (error) {
        throw { status: 404, message: 'Invalid tactical game' };
    }
};

const fetchExistingCharacter = async (tacticalCharacterId) => {
    if (!tacticalCharacterId) {
        throw { status: 404, message: 'Required tactical character identifier' };
    }
    try {
        const tacticalCharacter = await TacticalCharacter.findById(tacticalCharacterId);
        return handleNotFoundError(tacticalCharacter, 'Invalid tactical character');
    } catch (error) {
        throw { status: 404, message: 'Invalid tactical character' };
    }
};

const validateActionData = (data) => {
    if (!data.tacticalGameId) throw { status: 400, message: 'Required tactical game identifier' };
    if (!data.tacticalCharacterId) throw { status: 400, message: 'Required tactical character identifier' };
    if (!data.type) throw { status: 400, message: 'Required action type' };
    if (!data.actionPoints) throw { status: 400, message: 'Required action points' };
    if (data.phaseStart === undefined) throw { status: 400, message: 'Required start phase' };
    if (data.phaseStart < 1 || data.phaseStart > 4) throw { status: 400, message: 'Invalid start phase' };
    switch (data.type) {
        case 'attack':
            validateAttackData(data);
            break;
        case 'movement':
            break;
        default:
            throw { status: 400, message: 'Tactical action type not supported' };
    }
};

const validateAttackData = (data) => {
    const validModes = ['mainHand', 'offHand', 'dual',];
    if (!data.attackInfo) throw { status: 400, message: 'Required attack information' };
    if (!data.attackInfo.mainTargetId && !data.attackInfo.offHandTargetId) throw { status: 400, message: 'Required target' };
    if (!data.attackInfo.mode) throw { status: 400, message: 'Required attack mode' };
    if (!validModes.includes(data.attackInfo.mode)) throw { status: 400, message: 'Invalid attack mode' };
    data.attackInfo.chargeSpeed = data.attackInfo.chargeSpeed || 'none';
    data.attackInfo.restrictedQuarters = data.attackInfo.restrictedQuarters || 'none';
    data.attackInfo.parry = data.attackInfo.parry || 0;
}

const handleNotFoundError = (entity, message) => {
    if (!entity) {
        throw { status: 404, message };
    }
    return entity;
};

module.exports = {
    findById,
    find,
    insert,
    update,
    deleteById
};