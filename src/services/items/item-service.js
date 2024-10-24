const TacticalCharacter = require("../../models/tactical-character-model")
const tacticalCharacterConverter = require('../../converters/tactical-character-converter');

// adds an item to the inventory without equipping it
const addItem = async (characterId, item) => {
    const current = await TacticalCharacter.findById(characterId);
    if (!current) throw { status: 404, message: 'Tactical character not found' };
    if (!item.itemTypeId) throw { status: 400, message: 'Required itemTypeId' };
    if (!item.category) throw { status: 400, message: 'Required category' };
    if (!item.name) {
        item.name = item.itemTypeId;
    }
    const updatedCharacter = await TacticalCharacter.findByIdAndUpdate(
        characterId,
        { $push: { items: item } },
        { new: true });
    if (!updatedCharacter) throw { message: 'Tactical character not found' };
    const updatedWeight = await updateWeight(updatedCharacter);
    return tacticalCharacterConverter.toJSON(updatedWeight);
};

const deleteItem = async (characterId, itemId) => {
    const updatedCharacter = await TacticalCharacter.findByIdAndUpdate(
        characterId,
        { $pull: { items: { _id: itemId } } },
        { new: true });
    if (!updatedCharacter) {
        throw { message: 'Tactical character not found' };
    }
    const updatedWeight = await updateWeight(updatedCharacter);
    return tacticalCharacterConverter.toJSON(updatedWeight);
};

const getCharacterWeight = (character) => {
    return character.items.reduce((accumulator, item) => accumulator + getItemWeight(item), 0);
}

const updateWeight = async (character) => {
    const total = getCharacterWeight(character);
    const update = {
        equipment: character.equipment
    };
    update.equipment.weight = total;
    const updated = await TacticalCharacter.findOneAndUpdate({ _id: character._id }, update, {
        new: true,
        upsert: true
    });
    return updated;
};

const getItemWeight = (item) => {
    if (!item.info || !item.info.weight) {
        return 0;
    }
    return item.info.weight;
};

module.exports = {
    addItem,
    deleteItem,
    getCharacterWeight
};