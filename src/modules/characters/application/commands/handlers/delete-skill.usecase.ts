import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { CharacterProcessorService } from '../../../../../../src_exclude/domain/services/character-processor.service';
import { NotFoundError, ValidationError } from '../../../../shared/errors';
import { Character } from '../../../domain/entities/character.entity';
import * as characterRepository from '../../ports/out/character.repository';
import { DeleteSkillCommand } from '../delete-skill-command';

@CommandHandler(DeleteSkillCommand)
export class DeleteSkillUseCase implements ICommandHandler<DeleteSkillCommand, Character> {
  constructor(
    @Inject('CharacterProcessorService') private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository,
  ) {}

  async execute(command: DeleteSkillCommand): Promise<Character> {
    const characterId = command.characterId;
    const skillId = command.skillId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    const skill = character.skills.find((skill) => skill.skillId === skillId) || null;
    if (!skill) {
      throw new ValidationError(`Skill ${skillId} not found for character ${characterId}`);
    }
    character.skills = character.skills.filter((skill) => skill.skillId !== skillId);
    this.characterProcessorService.process(character);
    const updated: Character = await this.characterRepository.update(characterId, character);
    return updated;
  }
}
