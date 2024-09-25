const TacticalGame = require("../models/tactical-game-model");
const TacticalCharacter = require("../models/tactical-character-model");
const TacticalAction = require("../models/tactical-action-model");

const tacticalActionConverter = require("../converters/tactical-action-converter");

const findById = async (id) => {
    const readed = await TacticalAction.findById(id);
    if (!readed) {
        throw new { status: 404, message: "Tactical action not found" };
    }
    return tacticalActionConverter.toJSON(readed);
};

const find = async (tacticalGameId, tacticalCharacterId, round, page, size) => {
    let filter = {};
    if (tacticalGameId) {
        filter.tacticalGameId = tacticalGameId;
    }
    if(tacticalCharacterId) {
        filter.tacticalCharacterId = tacticalCharacterId;
    }
    if(round) {
        filter.round = round;
    }
    const skip = page * size;
    const list = await TacticalAction.find(filter).skip(skip).limit(size).sort({ updatedAt: -1 });
    const count = await TacticalAction.countDocuments(filter);
    const content = list.map(tacticalActionConverter.toJSON);
    return { content: content, pagination: { page: page, size: size, totalElements: count } };
};

const insert = async (data) => {
    const newAction = new TacticalAction({
        tacticalGameId: data.tacticalGameId,
        round: data.round,
        tacticalCharacterId: data.tacticalCharacterId,
        type: data.type,
        description: data.description,
        phaseStart: data.phaseStart,
        actionPoints: data.actionPoints
    });
    const savedAction = await newAction.save();
    return tacticalActionConverter.toJSON(savedAction);
};

const update = async (actionId, data) => {
    const { description } = data;
    const updatedAction = await TacticalAction.findByIdAndUpdate(actionId, { description }, { new: true });
    if (!updatedAction) {
        throw new { status: 404, message: "Tactical action not found" };
    };
    return tacticalActionConverter.toJSON(updatedAction);
};

const deleteById = async (actionId) => {
    const deletedAction = await TacticalAction.findByIdAndDelete(actionId);
    if (!deletedAction) {
        throw { status: 404, message: "Tactical action not found" };
    }
};

module.exports = {
    findById,
    find,
    insert,
    update,
    deleteById
};