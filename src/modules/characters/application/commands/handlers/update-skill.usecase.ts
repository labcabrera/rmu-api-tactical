import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NotFoundError } from '../../../../shared/errors';
import { Character } from '../../../domain/entities/character.entity';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as characterRepository from '../../ports/out/character.repository';
import { UpdateSkillCommand } from '../update-skill.command';

@CommandHandler(UpdateSkillCommand)
export class UpdateSkillUseCase implements ICommandHandler<UpdateSkillCommand, Character> {
  constructor(
    @Inject('CharacterProcessorService') private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository,
  ) {}

  async execute(command: UpdateSkillCommand): Promise<Character> {
    const characterId = command.characterId;
    const skillId = command.skillId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    const skill = character.skills.find((skill) => skill.skillId === skillId) || null;
    if (!skill) {
      throw new Error(`Skill ${skillId} not found for character ${characterId}`);
    }
    skill.ranks = command.ranks || skill.ranks;
    skill.customBonus = command.customBonus || skill.customBonus;
    this.characterProcessorService.process(character);
    const updated: Character = await this.characterRepository.update(characterId, character);
    return updated;
  }
}
