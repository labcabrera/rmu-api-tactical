const TacticalCharacter = require("../../models/tactical-character-model")
const tacticalCharacterConverter = require('../../converters/tactical-character-converter');

const equip = async (characterId, data) => {
    if (!data.itemId) throw { status: 400, message: 'Required itemId' };

    const currentCharacter = await TacticalCharacter.findById(characterId);
    const itemId = data.itemId;
    const slot = data.slot;

    if (!currentCharacter) throw { status: 404, message: 'Tactical character not found' };

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
    if (slot && slot === 'offHand' && item.weapon && item.weapon.requiredHands > 1) {
        throw { status: 400, message: 'Two handed weapons cant be equiped in offHand slot' };
    }
    // if an offHand item is equipped and you have a two-handed weapon, it is unequipped.
    if(slot && slot === 'offHand' && currentCharacter.equipment.mainHand) {
        const mainHandItem = currentCharacter.items.find(e => e.id == currentCharacter.equipment.mainHand);
        if(mainHandItem.weapon && mainHandItem.weapon.requiredHands > 1) {
            update.equipment.mainHand = null;
        }
    }
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

module.exports = {
    equip
};