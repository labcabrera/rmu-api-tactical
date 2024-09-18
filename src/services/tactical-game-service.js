const TacticalGame = require("../models/tactical-game-model");

const findById = async (id) => {
    const readedGame = await TacticalGame.findById(id);
    if (!readedGame) {
        throw new { status: 404, message: "Tactical game not found" };
    }
    return toJSON(readedGame);
}

const findAll = async (page, size) => {
    const skip = page * size;
    const list = await TacticalGame.find().skip(skip).limit(size).sort({ updatedAt: -1 });
    const count = await TacticalGame.countDocuments();
    const content = list.map(toJSON);
    return { content: content, pagination: { page: page, size: size, totalElements: count } };
};

const save = async (user, data) => {
    const newGame = new TacticalGame({
        user: user,
        name: data.name,
        description: data.description,
        status: 'created',
        round: 0
    });
    const savedGame = await newGame.save();
    return toJSON(savedGame);
};

const update = async (gameId, data) => {
    const { name, description } = data;
    const updatedGame = await TacticalGame.findByIdAndUpdate(gameId, { name, description }, { new: true });
    if (!updatedGame) {
        throw new { status: 404, message: "Race not found" };
    };
    return toJSON(updatedGame);
};

const deleteById = async (gameId) => {
    const deletedGame = await TacticalGame.findByIdAndDelete(gameId);
    if (!deletedGame) {
        throw { status: 404, message: "Race not found" };
    }
}


const toJSON = (tacticalGame) => {
    return {
        id: tacticalGame._id,
        name: tacticalGame.name,
        status: tacticalGame.status,
        round: tacticalGame.round,
        user: tacticalGame.user,
        description: tacticalGame.description,
        createdAt: tacticalGame.createdAt,
        updatedAt: tacticalGame.updatedAt
    };
}

module.exports = {
    findById,
    findAll,
    save,
    update,
    deleteById
};