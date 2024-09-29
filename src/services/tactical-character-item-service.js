const TacticalCharacter = require("../models/tactical-character-model")
const tacticalCharacterConverter = require('../converters/tactical-character-converter');

const addItem = async (characterId, item) => {
    const current = await TacticalCharacter.findById(characterId);
    if (!current) {
        throw { state: 404, message: 'Tactical character not found' };
    }
    if(!item.itemTypeId) {
        throw { state: 400, message: 'Required itemTypeId' };
    }
    if(!item.category) {
        throw { state: 400, message: 'Required category' };
    }
    //TODO fetch
    const updatedCharacter = await TacticalCharacter.findByIdAndUpdate(
        characterId,
        { $push: { items: item } },
        { new: true });
    if (!updatedCharacter) {
        throw { message: 'Tactical character not found' };
    }
    return tacticalCharacterConverter.toJSON(updatedCharacter);
};

const deleteItem = async (characterId, itemId) => {
    const updatedCharacter = await TacticalCharacter.findByIdAndUpdate(
        characterId,
        { $pull: { items: { _id: itemId } } },
        { new: true });
    if (!updatedCharacter) {
        throw { message: 'Tactical character not found' };
    }
    return tacticalCharacterConverter.toJSON(updatedCharacter);
};

module.exports = {
    addItem,
    deleteItem
};