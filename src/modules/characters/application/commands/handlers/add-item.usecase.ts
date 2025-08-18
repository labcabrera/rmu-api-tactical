import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';

import { NotFoundError } from '../../../../shared/errors';
import { Character, CharacterItem } from '../../../domain/entities/character.entity';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as characterRepository from '../../ports/out/character.repository';
import { AddItemCommand } from '../add-item.comand';

@CommandHandler(AddItemCommand)
export class AddItemUseCase implements ICommandHandler<AddItemCommand, Character> {
  constructor(
    @Inject('CharacterProcessorService') private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository,
  ) {}

  async execute(command: AddItemCommand): Promise<Character> {
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
