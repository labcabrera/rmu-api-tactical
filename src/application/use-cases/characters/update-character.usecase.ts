import { inject, injectable } from 'inversify';

import { Character } from '@domain/entities/character.entity';
import { Logger } from '@domain/ports/logger';
import { CharacterRepository } from '@domain/ports/outbound/character.repository';
import { CharacterProcessorService } from '@domain/services/character-processor.service';

import { UpdateCharacterCommand } from '@application/commands/update-character.command';
import { TYPES } from '@shared/types';
import { NotFoundError } from '../../../domain/errors/errors';

@injectable()
export class UpdateCharacterUseCase {
  constructor(
    @inject(TYPES.CharacterProcessorService)
    private readonly characterProcessorService: CharacterProcessorService,
    @inject(TYPES.CharacterRepository)
    private readonly characterRepository: CharacterRepository,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async execute(command: UpdateCharacterCommand): Promise<Character> {
    try {
      this.logger.info(`UpdateTacticalCharacterUseCase: Updating tactical character: ${command.characterId}`);
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
    } catch (error) {
      this.logger.error(`Error updating tactical character: ${error}`);
      throw Error(`Failed to update tactical character: ${error}`);
    }
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
