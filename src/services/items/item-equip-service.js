const TacticalCharacter = require("../../models/tactical-character-model")
const tacticalCharacterConverter = require('../../converters/tactical-character-converter');

const equip = async (characterId, data) => {
    if (!data.itemId) throw { status: 400, message: 'Required itemId' };

    const character = await TacticalCharacter.findById(characterId);
    validateEquipData(character, data);

    const itemId = data.itemId;
    const slot = data.slot;
    const item = character.items.find(e => e.id == itemId);

    if (slot === 'body' && item.armor && item.armor.armorType) {
        character.defense.armorType = item.armor.armorType;
    }
    const slots = ['mainHand', 'offHand', 'body', 'head', 'arms', 'legs'];
    for (const checkSlot of slots) {
        if (character.equipment[checkSlot] == itemId) {
            character.equipment[checkSlot] = null;
        }
    }
    if (slot) {
        character.equipment[slot] = itemId;
    }
    if (slot && slot === 'mainHand' && item.weapon && item.weapon.requiredHands > 1) {
        character.equipment.offHand = null;
    }
    if (slot && slot === 'offHand' && item.weapon && item.weapon.requiredHands > 1) {
        throw { status: 400, message: 'Two handed weapons cant be equiped in offHand slot' };
    }
    if(slot && slot === 'offHand' && character.equipment.mainHand) {
        const mainHandItem = character.items.find(e => e.id == character.equipment.mainHand);
        if(mainHandItem.weapon && mainHandItem.weapon.requiredHands > 1) {
            character.equipment.mainHand = null;
        }
    }
    // No armor equiped
    if (character.equipment.body === null) {
        character.defense.armorType = 1;
    }

    await character.save();
    return tacticalCharacterConverter.toJSON(character);
};

const validateEquipData = (currentCharacter, data) => {
    if (!currentCharacter) throw { status: 404, message: 'Tactical character not found' };
    const itemId = data.itemId;
    const slot = data.slot;
    const item = currentCharacter.items.find(e => e.id == itemId);
    if (!item) throw { status: 400, message: 'Invalid itemId' };

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
};

module.exports = {
    equip
};