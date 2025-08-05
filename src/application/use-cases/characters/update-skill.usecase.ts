import { inject, injectable } from 'inversify';

import { Character } from '@domain/entities/character.entity';
import { Logger } from '@application/ports/logger';
import { CharacterRepository } from '@application/ports/outbound/character.repository';
import { CharacterProcessorService } from '@domain/services/character-processor.service';

import { UpdateSkillCommand } from '@application/commands/update-skill.command';
import { NotFoundError } from '../../../domain/errors/errors';
import { TYPES } from '../../../shared/types';

@injectable()
export class UpdateSkillUseCase {
  constructor(
    @inject(TYPES.CharacterProcessorService)
    private readonly characterProcessorService: CharacterProcessorService,
    @inject(TYPES.CharacterRepository)
    private readonly characterRepository: CharacterRepository,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async execute(command: UpdateSkillCommand): Promise<Character> {
    try {
      this.logger.info(`UpdateSkillUseCase: Updating skill ${command.skillId} for character ${command.characterId}`);
      const characterId = command.characterId;
      const skillId = command.skillId;
      const character = await this.characterRepository.findById(command.characterId);
      if (!character) {
        throw new NotFoundError('Character', characterId);
      }
      const skill = character.skills.find(skill => skill.skillId === skillId) || null;
      if (!skill) {
        throw new Error(`Skill ${skillId} not found for character ${characterId}`);
      }
      skill.ranks = command.ranks || skill.ranks;
      skill.customBonus = command.customBonus || skill.customBonus;
      this.characterProcessorService.process(character);
      const updated: Character = await this.characterRepository.update(characterId, character);
      return updated;
    } catch (error: any) {
      this.logger.error(
        `AddSkillUseCase: Error adding skill to tactical character ${command.characterId}: ${error.message}`
      );
      throw new Error(`Error adding skill to tactical character ${command.characterId}: ${error.message}`);
    }
  }
}
