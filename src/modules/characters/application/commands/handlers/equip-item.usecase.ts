import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NotFoundError } from '../../../../shared/errors';
import { Character, CharacterEquipment, CharacterItem } from '../../../domain/entities/character.entity';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as characterRepository from '../../ports/out/character.repository';
import { EquipItemCommand } from '../equip-item-command';

@CommandHandler(EquipItemCommand)
export class EquipItemUseCase implements ICommandHandler<EquipItemCommand, Character> {
  constructor(
    @Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository,
    @Inject('CharacterProcessorService') private readonly characterProcessorService: CharacterProcessorService,
  ) {}

  async execute(command: EquipItemCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }

    const item: CharacterItem = character.items.find((e: any) => e.id === command.itemId) as CharacterItem;
    if (!item) {
      throw new Error(`Item not found: ${command.itemId}`);
    }

    this.validateEquipmentData(character, item, command);
    this.applyEquipmentLogic(character, item, command);

    this.characterProcessorService.process(character);
    return await this.characterRepository.update(command.characterId, character);
  }

  private validateEquipmentData(character: Character, item: CharacterItem, command: EquipItemCommand): void {
    if (command.slot) {
      switch (command.slot) {
        case 'mainHand':
        case 'offHand':
          if (item.category === 'armor') {
            throw new Error('Can not equip armor types in main hand or off-hand');
          }
          break;
        case 'body':
        case 'head':
          if (item.category !== 'armor') {
            throw new Error('Required armor type for the requested slot');
          }
          break;
        default:
          throw new Error('Invalid item slot');
      }
      if (command.slot === 'offHand' && item.weapon && item.weapon.requiredHands > 1) {
        throw new Error('Two handed weapons cant be equiped in offHand slot');
      }
    }
  }

  private applyEquipmentLogic(character: Character, item: CharacterItem, command: EquipItemCommand): void {
    const slot = command.slot;
    const equipment: CharacterEquipment = character.equipment;
    const slots: (keyof CharacterEquipment)[] = ['mainHand', 'offHand', 'body', 'head'];
    slots.forEach((s) => {
      if (equipment[s] === command.itemId) {
        equipment[s] = null;
      }
    });
    if (command.slot === 'offHand' && item.weapon && item.weapon.requiredHands > 1) {
      equipment.offHand = null;
    }

    // Set armor type if equipping body armor
    if (slot === 'body' && item.armor && item.armor.armorType) {
      character.defense.armorType = item.armor.armorType;
    }

    // Equip item to specified slot
    if (slot === 'mainHand') {
      equipment.mainHand = command.itemId;
    } else if (slot === 'offHand') {
      equipment.offHand = command.itemId;
    } else if (slot === 'body') {
      equipment.body = command.itemId;
    } else if (slot === 'head') {
      equipment.head = command.itemId;
    }

    // Handle two-handed weapon in main hand
    if (slot === 'mainHand' && item.weapon && item.weapon.requiredHands > 1) {
      equipment.offHand = null;
    }

    // Set default armor type when no body armor is equipped
    // if (!equipment.body) {
    //   //TODO check racial armor type
    //   character.defense.armorType = 1;
    // }
  }
}
