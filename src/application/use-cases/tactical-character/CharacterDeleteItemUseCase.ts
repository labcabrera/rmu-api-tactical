import { Logger } from '../../../domain/ports/Logger';
import { TacticalCharacterRepository } from '../../../domain/ports/TacticalCharacterRepository';

export interface CharacterDeleteItemCommand {
    characterId: string;
    itemId: string;
}

export interface CharacterWithDeletedItem {
    id: string;
    name: string;
    gameId: string;
    faction: string;
    items: Array<{
        id: string;
        itemTypeId: string;
        category: string;
        name: string;
        info?: {
            weight?: number;
        };
        [key: string]: any;
    }>;
    equipment: {
        weight: number;
        mainHand?: string | null;
        offHand?: string | null;
        body?: string | null;
        head?: string | null;
        arms?: string | null;
        legs?: string | null;
    };
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Use case for deleting an item from a character's inventory.
 * This use case handles item removal, equipment cleanup, and weight recalculation.
 */
export class CharacterDeleteItemUseCase {
    constructor(
        private readonly tacticalCharacterRepository: TacticalCharacterRepository,
        private readonly logger: Logger
    ) { }

    async execute(command: CharacterDeleteItemCommand): Promise<CharacterWithDeletedItem> {
        this.logger.info(`Deleting item ${command.itemId} from character ${command.characterId}`);

        // Find character
        const character = await this.tacticalCharacterRepository.findById(command.characterId);
        if (!character) {
            this.logger.error(`Tactical character not found: ${command.characterId}`);
            throw new Error('Tactical character not found');
        }

        // Check if item exists
        const itemExists = character.items?.some((item: any) =>
            (item.id || item._id?.toString()) === command.itemId
        );

        if (!itemExists) {
            this.logger.error(`Item not found in character inventory: ${command.itemId}`);
            throw new Error('Item not found in character inventory');
        }

        // Remove item from inventory
        const updatedItems = (character.items || []).filter((item: any) =>
            (item.id || item._id?.toString()) !== command.itemId
        );

        // Clean up equipment if the deleted item was equipped
        const updatedEquipment = this.cleanupEquipment(character.equipment || {}, command.itemId);

        // Calculate new weight
        const newWeight = this.calculateTotalWeight(updatedItems);
        updatedEquipment.weight = newWeight;

        // Update character
        const updatedCharacter = await this.tacticalCharacterRepository.update(command.characterId, {
            items: updatedItems,
            equipment: updatedEquipment
        });

        if (!updatedCharacter) {
            this.logger.error(`Failed to update character after deleting item: ${command.characterId}`);
            throw new Error('Failed to update character after deleting item');
        }

        this.logger.info(`Successfully deleted item ${command.itemId} from character ${command.characterId}`);

        return this.mapToCharacterWithDeletedItem(updatedCharacter);
    }

    private cleanupEquipment(equipment: any, deletedItemId: string): any {
        const updatedEquipment = { ...equipment };
        const slots = ['mainHand', 'offHand', 'body', 'head', 'arms', 'legs'];

        // Remove the deleted item from any equipment slot
        for (const slot of slots) {
            if (updatedEquipment[slot] === deletedItemId) {
                updatedEquipment[slot] = null;
                this.logger.info(`Removed deleted item from ${slot} slot`);
            }
        }

        return updatedEquipment;
    }

    private calculateTotalWeight(items: any[]): number {
        return items.reduce((accumulator: number, item: any) => {
            return accumulator + this.getItemWeight(item);
        }, 0);
    }

    private getItemWeight(item: any): number {
        if (!item.info || !item.info.weight) {
            return 0;
        }
        return item.info.weight;
    }

    private mapToCharacterWithDeletedItem(character: any): CharacterWithDeletedItem {
        return {
            id: character.id || character._id?.toString(),
            name: character.name,
            gameId: character.gameId,
            faction: character.faction,
            items: (character.items || []).map((item: any) => ({
                id: item.id || item._id?.toString(),
                itemTypeId: item.itemTypeId,
                category: item.category,
                name: item.name,
                info: item.info ? {
                    weight: item.info.weight
                } : undefined,
                ...item
            })),
            equipment: {
                weight: character.equipment?.weight || 0,
                mainHand: character.equipment?.mainHand || null,
                offHand: character.equipment?.offHand || null,
                body: character.equipment?.body || null,
                head: character.equipment?.head || null,
                arms: character.equipment?.arms || null,
                legs: character.equipment?.legs || null,
            },
            createdAt: character.createdAt,
            updatedAt: character.updatedAt,
        };
    }
}
