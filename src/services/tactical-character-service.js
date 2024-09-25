const TacticalCharacter = require("../models/tactical-character-model")
const TacticalGame = require("../models/tactical-game-model")
const tacticalCharacterConverter = require('../converters/tactical-character-converter');

const findById = async (characterId) => {
    const readed = await TacticalCharacter.findById(characterId);
    if (!readed) {
        throw new { status: 404, message: 'Tactical character not found' };
    }
    return tacticalCharacterConverter.toJSON(readed);
};

const find = async (searchExpression, tacticalGameId, page, size) => {
    let filter = {};
    if (tacticalGameId) {
        filter.tacticalGameId = tacticalGameId;
    }
    const skip = page * size;
    const list = await TacticalCharacter.find(filter).skip(skip).limit(size).sort({ updatedAt: -1 });
    const count = await TacticalCharacter.countDocuments(filter);
    const content = list.map(tacticalCharacterConverter.toJSON);
    return { content: content, pagination: { page: page, size: size, totalElements: count } };
}

const insert = async (user, data) => {
    const tacticalGame = await TacticalGame.findById(data.tacticalGameId);
    if (!tacticalGame) {
        throw { status: 400, message: "Tactical game not found" };
    }
    if (!data.faction) {
        throw { status: 400, message: "Required faction" };
    }
    if (!tacticalGame.factions.includes(data.faction)) {
        throw { status: 400, message: "Invalid faction" };
    }
    const { name, tacticalGameId, faction, info, hp, initiative, skills, items, description } = data;
    const newCharacter = new TacticalCharacter({
        name: name,
        tacticalGameId: tacticalGameId,
        faction: faction,
        info: info,
        hp: hp,
        initiative: initiative,
        skills: skills,
        items: items,
        description: description,
        equipment: {
            mainHand: null,
            offHand: null,
            head: null,
            body: null
        },
        user: user
    });
    const savedCharacter = await newCharacter.save();
    return tacticalCharacterConverter.toJSON(savedCharacter);
};

const update = async (characterId, data) => {
    const { name, description } = data;
    const updatedCharacter = await TacticalCharacter.findByIdAndUpdate(characterId, { name, description }, { new: true });
    if (!updatedCharacter) {
        throw new { status: 404, message: "Tactical character not found" };
    };
    return tacticalCharacterConverter.toJSON(updatedCharacter);
};

const addCharacterEffect = async (characterId, data) => {
    const { type, value, rounds } = data;
    const effects = { type: type, value: value, rounds: rounds };
    const updatedCharacter = await TacticalCharacter.findByIdAndUpdate(
        characterId,
        { $push: { effects: effects } },
        { new: true });
    if (!updatedCharacter) {
        throw { message: 'Tactical character not found' };
    }
}

const deleteCharacterEffect = async (characterId, effectId) => {
    const updatedCharacter = await TacticalCharacter.findByIdAndUpdate(
        characterId,
        { $pull: { effects: { _id: effectId } } },
        { new: true });
    if (!updatedCharacter) {
        throw { message: 'Tactical character not found' };
    }
    return toJSON(updatedCharacter);
}

const setCurrentHp = async (characterId, hp) => {
    const readedCharacter = await TacticalCharacter.findById(characterId);
    if (!readedCharacter) {
        throw { status: 400, message: "Character not found" };
    }
    const maxHp = readedCharacter.hp.max;
    const currentHp = readedCharacter.hp.current;
    if (hp > maxHp) {
        throw { status: 400, message: "Value (" + hp + ") exceeds the character's maximum life points (" + maxHp + ")" };
    } else if (hp === currentHp) {
        throw { status: 304, message: "Not modified" };
    }
    const updatedCharacter = await TacticalCharacter.findByIdAndUpdate(
        characterId,
        { hp: { max: maxHp, current: hp } },
        { new: true });
    return toJSON(updatedCharacter);
}

module.exports = {
    findById,
    find,
    insert,
    update,
    addCharacterEffect,
    deleteCharacterEffect,
    setCurrentHp
};