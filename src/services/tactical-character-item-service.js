const TacticalCharacter = require("../models/tactical-character-model")
const tacticalCharacterConverter = require('../converters/tactical-character-converter');

const addItem = async (characterId, item) => {
    const current = await TacticalCharacter.findById(characterId);
    if (!current) {
        throw { status: 404, message: 'Tactical character not found' };
    }
    if (!item.itemTypeId) {
        throw { status: 400, message: 'Required itemTypeId' };
    }
    if (!item.category) {
        throw { status: 400, message: 'Required category' };
    }
    if (!item.name) {
        item.name = item.itemTypeId;
    }
    //TODO fetch
    const updatedCharacter = await TacticalCharacter.findByIdAndUpdate(
        characterId,
        { $push: { items: item } },
        { new: true });
    if (!updatedCharacter) {
        throw { message: 'Tactical character not found' };
    }
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

const equip = async (characterId, data) => {
    const currentCharacter = await TacticalCharacter.findById(characterId);
    const itemId = data.itemId;
    const slot = data.slot;
    if (!currentCharacter) {
        throw { status: 404, message: 'Tactical character not found' };
    }
    if (!itemId) {
        throw { status: 400, message: 'Required itemId' };
    }
    if (slot) {
        switch (slot) {
            case 'mainHand': break;
            case 'offHand': break;
            case 'body': break;
            case 'head': break;
            case 'arms': break;
            case 'legs': break;
            default:
                throw { status: 400, message: 'Invalid item slot' };
        }
    }
    const item = currentCharacter.items.find(e => e.id == itemId);
    if (!item) {
        throw { status: 400, message: 'Invalid itemId' };
    }
    const update = {
        equipment: currentCharacter.equipment
    };
    const slots = ['mainHand', 'offHand', 'body', 'head', 'arms', 'legs'];
    for (const checkSlot of slots) {
        if (update.equipment[checkSlot] == itemId) {
            update.equipment[checkSlot] = null;
        }
    }
    if (slot) {
        update.equipment[slot] = itemId;
    }
    const updated = await TacticalCharacter.findOneAndUpdate({ _id: characterId }, update, {
        new: true,
        upsert: true
    });
    return tacticalCharacterConverter.toJSON(updated);
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
    equip,
    getCharacterWeight
};