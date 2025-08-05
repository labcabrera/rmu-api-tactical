import { Character } from '@domain/entities/character.entity';
import { Logger } from '@domain/ports/logger';
import { CharacterRepository } from '@domain/ports/outbound/character.repository';
import { CharacterProcessorService } from '@domain/services/character-processor.service';

import { DeleteSkillCommand } from '@application/commands/delete-skill-command';
import { inject, injectable } from 'inversify';
import { NotFoundError } from '../../../domain/errors/errors';
import { TYPES } from '../../../shared/types';

@injectable()
export class DeleteSkillUseCase {
  constructor(
    @inject(TYPES.CharacterProcessorService)
    private readonly characterProcessorService: CharacterProcessorService,
    @inject(TYPES.CharacterRepository)
    private readonly characterRepository: CharacterRepository,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async execute(command: DeleteSkillCommand): Promise<Character> {
    try {
      this.logger.info(`DeleteSkillUseCase: Deleting skill << ${command.skillId} for character ${command.characterId}`);
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
      character.skills = character.skills.filter(skill => skill.skillId !== skillId);
      this.characterProcessorService.process(character);
      const updated: Character = await this.characterRepository.update(characterId, character);
      return updated;
    } catch (error: any) {
      this.logger.error(
        `DeleteSkillUseCase: Error deleting skill from tactical character ${command.characterId}: ${error.message}`
      );
      throw new Error(`Error deleting skill from tactical character ${command.characterId}: ${error.message}`);
    }
  }
}
