import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NotFoundError } from '../../../../shared/domain/errors';
import { Character } from '../../../domain/entities/character.entity';
import * as characterRepository from '../../ports/out/character.repository';
import { DeleteItemCommand } from '../delete-item.command';

@CommandHandler(DeleteItemCommand)
export class DeleteItemCommandHandler implements ICommandHandler<DeleteItemCommand, Character> {
  constructor(@Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository) {}

  async execute(command: DeleteItemCommand): Promise<Character> {
    const { characterId, itemId } = command;
    const character = await this.characterRepository.findById(characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    const item = character.items.find((item) => item.id === itemId);
    if (!item) {
      throw new NotFoundError('Character Item', itemId);
    }
    character.items = character.items.filter((item) => item.id !== itemId);
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
