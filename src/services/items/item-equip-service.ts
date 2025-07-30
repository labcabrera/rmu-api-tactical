import tacticalCharacterConverter from '../../converters/tactical-character-converter';
import { DependencyContainer } from '../../infrastructure/DependencyContainer';
import TacticalCharacterDocument from "../../models/tactical-character-model";
import { TacticalCharacterModel } from '../../types';

interface EquipData {
    itemId: string;
    slot?: string;
}

const equip = async (characterId: string, data: EquipData): Promise<any> => {
    if (!data.itemId) throw { status: 400, message: 'Required itemId' };

    const character = await TacticalCharacterDocument.findById(characterId);
    validateEquipData(character, data);

    const itemId = data.itemId;
    const slot = data.slot;
    const item = (character as any).items.find((e: any) => e.id == itemId);

    if (slot === 'body' && item.armor && item.armor.armorType) {
        (character as any).defense.armorType = item.armor.armorType;
    }
    const slots = ['mainHand', 'offHand', 'body', 'head', 'arms', 'legs'];
    for (const checkSlot of slots) {
        if ((character as any).equipment[checkSlot] == itemId) {
            (character as any).equipment[checkSlot] = null;
        }
    }
    if (slot) {
        (character as any).equipment[slot] = itemId;
    }
    if (slot && slot === 'mainHand' && item.weapon && item.weapon.requiredHands > 1) {
        (character as any).equipment.offHand = null;
    }
    if (slot && slot === 'offHand' && item.weapon && item.weapon.requiredHands > 1) {
        throw { status: 400, message: 'Two handed weapons cant be equiped in offHand slot' };
    }
    if (slot && slot === 'offHand' && (character as any).equipment.mainHand) {
        const mainHandItem = (character as any).items.find((e: any) => e.id == (character as any).equipment.mainHand);
        if (mainHandItem.weapon && mainHandItem.weapon.requiredHands > 1) {
            (character as any).equipment.mainHand = null;
        }
    }
    // No armor equiped
    if ((character as any).equipment.body === null) {
        (character as any).defense.armorType = 1;
    }
    const container = DependencyContainer.getInstance();
    const characterProcessorService = container.characterProcessorService;
    characterProcessorService.process(character as any);
    await character?.save();
    if (!character) {
        throw { status: 404, message: 'Character not found after processing' };
    }
    return tacticalCharacterConverter.toJSON(character);
};

const validateEquipData = (currentCharacter: TacticalCharacterModel | null, data: EquipData): void => {
    if (!currentCharacter) throw { status: 404, message: 'Tactical character not found' };
    const itemId = data.itemId;
    const slot = data.slot;
    const item = (currentCharacter as any).items.find((e: any) => e.id == itemId);
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

export default {
    equip
};
