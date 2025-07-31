import { randomUUID } from 'crypto';

import { CharacterItem, TacticalCharacter } from '@domain/entities/tactical-character.entity';
import { Logger } from '@domain/ports/logger';
import { TacticalCharacterRepository } from '@domain/ports/tactical-character.repository';

import { CharacterAddItemCommand } from '@application/commands/add-item.comand';

export class AddItemUseCase {

    constructor(
        private readonly tacticalCharacterRepository: TacticalCharacterRepository,
        private readonly logger: Logger
    ) { }

    async execute(command: CharacterAddItemCommand): Promise<TacticalCharacter> {
        this.logger.info(`Adding item ${command.item.itemTypeId} to character ${command.characterId}`);

        this.validateCommand(command);
        const characterId = command.characterId;
        const character: TacticalCharacter = await this.tacticalCharacterRepository.findById(command.characterId);
        const item: CharacterItem = {
            id: randomUUID(),
            name: command.item.name ? command.item.name : command.item.itemTypeId,
            itemTypeId: command.item.itemTypeId,
            category: command.item.category,
        };
        character.items.push(item);
        character.equipment.weight = this.calculateTotalWeight(character.items);
        const updated = await this.tacticalCharacterRepository.update(characterId, character);
        return updated;
    }

    private validateCommand(command: CharacterAddItemCommand): void {
        if (!command.item.itemTypeId) {
            throw new Error('Required itemTypeId');
        }
        if (!command.item.category) {
            throw new Error('Required category');
        }
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

    
}
