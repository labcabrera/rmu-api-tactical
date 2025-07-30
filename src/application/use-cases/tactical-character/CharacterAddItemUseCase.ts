import { Logger } from '../../../domain/ports/logger';
import { TacticalCharacterRepository } from '../../../domain/ports/tactical-character.repository';

export interface CharacterAddItemCommand {
    characterId: string;
    item: {
        itemTypeId: string;
        category: string;
        name?: string;
        info?: {
            weight?: number;
        };
        [key: string]: any;
    };
}

export interface CharacterWithAddedItem {
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
 * Use case for adding an item to a character's inventory without equipping it.
 * This use case handles item validation, inventory management, and weight recalculation.
 */
export class CharacterAddItemUseCase {
    constructor(
        private readonly tacticalCharacterRepository: TacticalCharacterRepository,
        private readonly logger: Logger
    ) { }

    async execute(command: CharacterAddItemCommand): Promise<CharacterWithAddedItem> {
        this.logger.info(`Adding item ${command.item.itemTypeId} to character ${command.characterId}`);

        // Validate command
        this.validateCommand(command);

        // Find character
        const character = await this.tacticalCharacterRepository.findById(command.characterId);
        if (!character) {
            this.logger.error(`Tactical character not found: ${command.characterId}`);
            throw new Error('Tactical character not found');
        }

        // Prepare item
        const itemToAdd = this.prepareItem(command.item);

        // Add item to character's inventory
        const updatedItems = [...(character.items || []), itemToAdd];

        // Calculate new weight
        const newWeight = this.calculateTotalWeight(updatedItems);

        // Update character with new item and weight
        const updatedCharacter = await this.tacticalCharacterRepository.update(command.characterId, {
            items: updatedItems,
            equipment: {
                ...character.equipment,
                weight: newWeight
            }
        });

        if (!updatedCharacter) {
            this.logger.error(`Failed to update character after adding item: ${command.characterId}`);
            throw new Error('Failed to update character after adding item');
        }

        this.logger.info(`Successfully added item ${command.item.itemTypeId} to character ${command.characterId}`);

        return this.mapToCharacterWithAddedItem(updatedCharacter);
    }

    private validateCommand(command: CharacterAddItemCommand): void {
        if (!command.item.itemTypeId) {
            this.logger.error('Missing required itemTypeId');
            throw new Error('Required itemTypeId');
        }

        if (!command.item.category) {
            this.logger.error('Missing required category');
            throw new Error('Required category');
        }
    }

    private prepareItem(item: CharacterAddItemCommand['item']): any {
        const preparedItem = { ...item };

        // Set default name if not provided
        if (!preparedItem.name) {
            preparedItem.name = preparedItem.itemTypeId;
        }

        return preparedItem;
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

    private mapToCharacterWithAddedItem(character: any): CharacterWithAddedItem {
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
