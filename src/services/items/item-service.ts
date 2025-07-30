import tacticalCharacterConverter from '../../converters/tactical-character-converter';
import TacticalCharacterDocument from "../../models/tactical-character-model";
import { TacticalCharacterModel } from '../../types';

interface Item {
    itemTypeId: string;
    category: string;
    name?: string;
    info?: {
        weight?: number;
    };
    [key: string]: any;
}

// adds an item to the inventory without equipping it
const addItem = async (characterId: string, item: Item): Promise<any> => {
    const current = await TacticalCharacterDocument.findById(characterId);
    if (!current) throw { status: 404, message: 'Tactical character not found' };
    if (!item.itemTypeId) throw { status: 400, message: 'Required itemTypeId' };
    if (!item.category) throw { status: 400, message: 'Required category' };
    if (!item.name) {
        item.name = item.itemTypeId;
    }
    const updatedCharacter = await TacticalCharacterDocument.findByIdAndUpdate(
        characterId,
        { $push: { items: item } },
        { new: true });
    if (!updatedCharacter) throw { message: 'Tactical character not found' };
    const updatedWeight = await updateWeight(updatedCharacter);
    return tacticalCharacterConverter.toJSON(updatedWeight);
};

const deleteItem = async (characterId: string, itemId: string): Promise<any> => {
    const updatedCharacter = await TacticalCharacterDocument.findByIdAndUpdate(
        characterId,
        { $pull: { items: { _id: itemId } } },
        { new: true });
    if (!updatedCharacter) {
        throw { message: 'Tactical character not found' };
    }
    const updatedWeight = await updateWeight(updatedCharacter);
    return tacticalCharacterConverter.toJSON(updatedWeight);
};

const getCharacterWeight = (character: TacticalCharacterModel): number => {
    return (character as any).items.reduce((accumulator: number, item: Item) => accumulator + getItemWeight(item), 0);
}

const updateWeight = async (character: TacticalCharacterModel): Promise<TacticalCharacterModel> => {
    const total = getCharacterWeight(character);
    const update = {
        equipment: (character as any).equipment
    };
    (update.equipment as any).weight = total;
    const updated = await TacticalCharacterDocument.findOneAndUpdate({ _id: character._id }, update, {
        new: true,
        upsert: true
    });
    if (!updated) {
        throw { status: 404, message: 'Character not found during weight update' };
    }
    return updated;
};

const getItemWeight = (item: Item): number => {
    if (!item.info || !item.info.weight) {
        return 0;
    }
    return item.info.weight;
};

export default {
    addItem,
    deleteItem,
    getCharacterWeight
};
