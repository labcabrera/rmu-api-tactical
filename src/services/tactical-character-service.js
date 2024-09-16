const TacticalCharacter = require("../models/tactical-character-model")
const TacticalGame = require("../models/tactical-game-model")

const findCharacterById = async (characterId) => {
    const readed = await TacticalCharacter.findById(characterId);
    return readed ? toJSON(readed) : readed;
};

const findCharactersByGameId = async (gameId, page, size) => {
    const skip = page * size;
    const readedCharacters = await TacticalCharacter.find({ tacticalGameId: gameId }).skip(skip).limit(size).sort({ updatedAt: -1 });
    const count = await TacticalCharacter.countDocuments({ tacticalGameId: gameId });
    const content = readedCharacters.map(toJSON);
    return { content: content, pagination: { page: page, size: size, totalElements: count } };
}

const createCharacter = async (gameId, data) => {
    const game = await TacticalGame.findById(gameId);
    if (!game) {
        throw { message: "Tactical game not found" };
    }
    const { name, info, hp, skills, items, equipment, description } = data;
    const newCharacter = new TacticalCharacter({ name, info, hp, skills, items, equipment, description });
    newCharacter.tacticalGameId = gameId;
    const savedCharacter = await newCharacter.save();
    return toJSON(savedCharacter);
}

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

const toJSON = (character) => {
    return {
        id: character._id,
        tacticalGameId: character.tacticalGameId,
        name: character.name,
        info: {
            level: character.info.level,
            race: character.info.race,
            size: character.info.size,
            armorType: character.info.armorType
        },
        hp: {
            max: character.hp.max,
            current: character.hp.current
        },
        effects: character.effects.map(mapEffect),
        skills: character.skills.map(mapSkill),
        items: character.items.map(mapItem),
        equipment: {
            mainHand: character.equipment.mainHand,
            offHand: character.equipment.offHand,
            head: character.equipment.head,
            body: character.equipment.body
        },
        description: character.description,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt
    };
}

const mapEffect = (effect) => {
    return {
        id: effect._id,
        type: effect.type,
        vale: effect.vale,
        rounds: effect.rounds
    }
}

const mapSkill = (skill) => {
    return {
        id: skill._id,
        skillId: skill.skillId,
        bonus: skill.bonus
    }
}

const mapItem = (item) => {
    return {
        id: item._id,
        name: item.name,
        category: item.category,
        itemTypeId: item.itemTypeId,
        attackTable: item.attackTable,
        skillId: item.skillId
    }
}

module.exports = {
    findCharacterById,
    findCharactersByGameId,
    createCharacter,
    addCharacterEffect,
    deleteCharacterEffect,
    setCurrentHp
};