import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';

import { NotFoundError } from '../../../../shared/domain/errors';
import { Character, CharacterItem } from '../../../domain/entities/character.entity';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as characterRepository from '../../ports/out/character.repository';
import * as itemClient from '../../ports/out/item-client';
import { AddItemCommand } from '../add-item.comand';

@CommandHandler(AddItemCommand)
export class AddItemCommandHandler implements ICommandHandler<AddItemCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository,
    @Inject('ItemClient') private readonly itemClient: itemClient.ItemClient,
  ) {}

  async execute(command: AddItemCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    const readedItem = await this.itemClient.getItemById(command.itemTypeId);
    const item: CharacterItem = {
      id: randomUUID(),
      name: command.name || command.itemTypeId,
      itemTypeId: command.itemTypeId,
      category: readedItem.category,
      weapon: readedItem.weapon,
      weaponRange: readedItem.weaponRange,
      armor: readedItem.armor,
      info: readedItem.info,
    };
    character.items.push(item);
    this.characterProcessorService.process(character);
    return await this.characterRepository.update(characterId, character);
  }
}
