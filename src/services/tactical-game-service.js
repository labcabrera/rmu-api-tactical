const TacticalGame = require('../models/tactical-game-model');
const TacticalCharacter = require('../models/tactical-character-model');
const TacticalCharacterRound = require('../models/tactical-character-round-model');
const TacticalAction = require('../models/tactical-action-model');

const tacticalGameConverter = require('../converters/tactical-game-converter');

const findById = async (id) => {
    const readedGame = await TacticalGame.findById(id);
    if (!readedGame) {
        throw { status: 404, message: 'Tactical game not found' };
    }
    return tacticalGameConverter.toJSON(readedGame);
};

const find = async (searchExpression, username, page, size) => {
    let filter = {};
    if (username) {
        filter.username = username;
    }
    const skip = page * size;
    const list = await TacticalGame.find(filter).skip(skip).limit(size).sort({ updatedAt: -1 });
    const count = await TacticalGame.countDocuments(filter);
    const content = list.map(tacticalGameConverter.toJSON);
    return { content: content, pagination: { page: page, size: size, totalElements: count } };
};

const insert = async (user, data) => {
    var factions = data.factions;
    if (!factions || factions.length === 0) {
        factions = ['Light', 'Evil', 'Neutral'];
    }
    const newGame = new TacticalGame({
        user: user,
        name: data.name,
        description: data.description,
        status: 'created',
        factions: factions,
        round: 0
    });
    const savedGame = await newGame.save();
    return tacticalGameConverter.toJSON(savedGame);
};

const update = async (gameId, data) => {
    const { name, description } = data;
    const updatedGame = await TacticalGame.findByIdAndUpdate(gameId, { name, description }, { new: true });
    if (!updatedGame) {
        throw { status: 404, message: 'Tactical game not found' };
    };
    return tacticalGameConverter.toJSON(updatedGame);
};

const deleteById = async (gameId) => {
    await TacticalCharacter.deleteMany({ tacticalGameId: gameId });
    await TacticalCharacterRound.deleteMany({ tacticalGameId: gameId });
    await TacticalAction.deleteMany({ tacticalGameId: gameId });
    const deletedGame = await TacticalGame.findByIdAndDelete(gameId);
    if (!deletedGame) {
        throw { status: 404, message: 'Tactical game not found' };
    }
};

module.exports = {
    findById,
    find,
    insert,
    update,
    deleteById
};