import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NotFoundError } from '../../../../shared/domain/errors';
import { Character } from '../../../domain/entities/character.entity';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as characterRepository from '../../ports/out/character.repository';
import { UpdateCharacterCommand } from '../update-character.command';

@CommandHandler(UpdateCharacterCommand)
export class UpdateCharacterCommandHandler implements ICommandHandler<UpdateCharacterCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository,
  ) {}

  async execute(command: UpdateCharacterCommand): Promise<Character> {
    const characterId = command.characterId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }

    this.bindBasicFields(character, command);
    this.bindInfoFielsds(character, command);
    this.bindMovementFielsds(character, command);
    this.bindHPFielsds(character, command);
    //TODO

    this.characterProcessorService.process(character);
    return await this.characterRepository.update(characterId, character);
  }

  private bindBasicFields(character: Character, command: UpdateCharacterCommand): void {
    if (command.name) {
      character.name = command.name;
    }
    if (command.faction) {
      character.faction = command.faction;
    }
  }

  private bindInfoFielsds(character: Character, command: UpdateCharacterCommand): void {
    if (!command.info) {
      return;
    }
    if (command.info.level) {
      character.info.level = command.info.level;
    }
    if (command.info.height) {
      character.info.height = command.info.height;
    }
    if (command.info.weight) {
      character.info.weight = command.info.weight;
    }
  }

  private bindMovementFielsds(character: Character, command: UpdateCharacterCommand): void {}

  private bindHPFielsds(character: Character, command: UpdateCharacterCommand): void {
    if (!command.hp) {
      return;
    }
    if (command.hp.current) {
      character.hp.current = command.hp.current;
    }
    if (command.hp.max) {
      character.hp.max = command.hp.max;
    }
  }
}
