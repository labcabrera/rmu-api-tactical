import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Character, CharacterSkill } from '../../../domain/entities/character.entity';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as characterRepository from '../../ports/out/character.repository';
import * as skillCategoryClient from '../../ports/out/skill-category-client';
import * as skillClient from '../../ports/out/skill-client';
import { AddSkillCommand } from '../add-skill.command';

@CommandHandler(AddSkillCommand)
export class AddSkillCommandHandler implements ICommandHandler<AddSkillCommand, Character> {
  constructor(
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository,
    @Inject('SkillClient') private readonly skillClient: skillClient.SkillClient,
    @Inject('SkillCategoryClient') private readonly skillCategoryClient: skillCategoryClient.SkillCategoryClient,
  ) {}

  async execute(command: AddSkillCommand): Promise<Character> {
    const characterId = command.characterId;
    const skillId = command.skillId;
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    if (this.hasSkillId(character, skillId)) {
      throw new ValidationError(`Skill ${skillId} already exists for character ${characterId}`);
    }
    const skillInfo = await this.skillClient.getSkillById(skillId);
    const skillCategoryInfo = await this.skillCategoryClient.getSkillCategoryById(skillInfo.categoryId);
    const statistics = [...skillCategoryInfo.bonus, ...skillInfo.bonus];
    //TODO read from api
    const racialBonus: number = 0;
    const skill: CharacterSkill = {
      skillId: command.skillId,
      specialization: command.specialization,
      statistics: statistics,
      ranks: command.ranks,
      statBonus: 0,
      racialBonus: racialBonus,
      developmentBonus: 0,
      customBonus: command.customBonus || 0,
      totalBonus: 0,
    };
    character.skills.push(skill);
    this.characterProcessorService.process(character);
    const updated: Character = await this.characterRepository.update(characterId, character);
    return updated;
  }

  private hasSkillId(character: Character, skillId: string): boolean {
    return character.skills.some((skill) => skill.skillId === skillId);
  }
}
