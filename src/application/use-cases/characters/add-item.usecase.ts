import { randomUUID } from 'crypto';
import { inject, injectable } from 'inversify';

import { Character, CharacterItem } from '@domain/entities/character.entity';
import { NotFoundError } from '@domain/errors/errors';
import { CharacterProcessorService } from '@domain/services/character-processor.service';

import { AddItemCommand } from '@application/commands/add-item.comand';
import { Logger } from '@application/ports/logger';
import { CharacterRepository } from '@application/ports/outbound/character.repository';
import { TYPES } from '@shared/types';

@injectable()
export class AddItemUseCase {
  constructor(
    @inject(TYPES.CharacterProcessorService) private readonly characterProcessorService: CharacterProcessorService,
    @inject(TYPES.CharacterRepository) private readonly characterRepository: CharacterRepository,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async execute(command: AddItemCommand): Promise<Character> {
    this.logger.info(`AddItemUseCase: Adding item ${command.item.itemTypeId} to character ${command.characterId}`);
    this.validateCommand(command);
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    const item: CharacterItem = {
      id: randomUUID(),
      name: command.item.name ? command.item.name : command.item.itemTypeId,
      itemTypeId: command.item.itemTypeId,
      category: command.item.category,
      weapon: command.item.weapon,
      weaponRange: command.item.weaponRange,
      armor: command.item.armor,
      info: command.item.info,
    };
    character.items.push(item);
    this.characterProcessorService.process(character);
    return await this.characterRepository.update(characterId, character);
  }

  private validateCommand(command: AddItemCommand): void {
    if (!command.characterId) {
      throw new Error('Required characterId');
    }
    if (!command.item) {
      throw new Error('Required item data');
    }
    if (!command.item.itemTypeId) {
      throw new Error('Required itemTypeId');
    }
    if (!command.item.category) {
      throw new Error('Required category');
    }
    if (command.item.category === 'weapon' && !command.item.weapon) {
      throw new Error('Required weapon data for weapon category');
    }
  }
}
