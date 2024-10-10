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
    const item = currentCharacter.items.find(e => e.id == itemId);
    if (!item) {
        throw { status: 400, message: 'Invalid itemId' };
    }
    if (slot) {
        switch (slot) {
            case 'mainHand':
            case 'offHand':
                if (item.category === 'armor') {
                    throw { status: 400, message: 'Can not equip armor types in main hand or off-hand' };
                }
                break;
            case 'body':
            case 'head':
            case 'arms':
            case 'legs':
                if (item.category !== 'armor') {
                    throw { status: 400, message: 'Required armor type for the requested slot' };
                }
                break;
            default:
                throw { status: 400, message: 'Invalid item slot' };
        }
    }
    const update = {
        equipment: currentCharacter.equipment
    };
    // Update equiped armor type
    if (slot === 'body' && item.armor && item.armor.armorType) {
        update.defense = currentCharacter.defense;
        update.defense.armorType = item.armor.armorType;
    }
    const slots = ['mainHand', 'offHand', 'body', 'head', 'arms', 'legs'];
    for (const checkSlot of slots) {
        if (update.equipment[checkSlot] == itemId) {
            update.equipment[checkSlot] = null;
        }
    }
    if (slot) {
        update.equipment[slot] = itemId;
    }
    if (slot && slot === 'mainHand' && item.weapon && item.weapon.requiredHands > 1) {
        update.equipment.offHand = null;
    }
    //TODO check equip offHand for validate 1H weapon in the other
    // No armor equiped
    if (update.equipment.body === null) {
        update.defense = currentCharacter.defense;
        update.defense.armorType = 1;
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