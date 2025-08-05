import { inject, injectable } from 'inversify';

import { Character } from '@domain/entities/character.entity';
import { NotFoundError } from '@domain/errors/errors';

import { Logger } from '@application/ports/logger';
import { CharacterRepository } from '@application/ports/outbound/character.repository';
import { TYPES } from '@shared/types';

@injectable()
export class DeleteItemUseCase {
  constructor(
    @inject(TYPES.CharacterRepository)
    private readonly characterRepository: CharacterRepository,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  //TODO refactor to use a command object
  async execute(characterId: string, itemId: string): Promise<Character> {
    const character = await this.characterRepository.findById(characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    const item = character.items.find(item => item.id === itemId);
    if (!item) {
      throw new NotFoundError('Character Item', itemId);
    }
    character.items = character.items.filter(item => item.id !== itemId);
    this.cleanupEquipedItem(character.equipment, itemId);
    character.equipment.weight = this.calculateTotalWeight(character.items);
    const updated = await this.characterRepository.update(characterId, character);
    return updated;
  }

  private cleanupEquipedItem(equipment: any, deletedItemId: string): void {
    const slots = ['mainHand', 'offHand', 'body', 'head', 'arms', 'legs'];
    for (const slot of slots) {
      if (equipment[slot] === deletedItemId) {
        equipment[slot] = null;
        this.logger.info(`Removed deleted item from ${slot} slot`);
      }
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
