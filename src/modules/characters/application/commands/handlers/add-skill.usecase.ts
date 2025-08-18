import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import * as skillCategoryClient from '../../../../../../src_exclude/application/ports/outbound/skill-category-client';
import * as skillClient from '../../../../../../src_exclude/application/ports/outbound/skill-client';
import { CharacterProcessorService } from '../../../../../../src_exclude/domain/services/character-processor.service';
import { NotFoundError } from '../../../../shared/errors';
import { Character, CharacterSkill } from '../../../domain/entities/character.entity';
import * as characterRepository_1 from '../../ports/out/character.repository';
import { AddSkillCommand } from '../add-skill.command';

@CommandHandler(AddSkillCommand)
export class AddSkillUseCase implements ICommandHandler<AddSkillCommand, Character> {
  constructor(
    @Inject('CharacterProcessorService') private readonly characterProcessorService: CharacterProcessorService,
    @Inject('CharacterRepository') private readonly characterRepository: characterRepository_1.CharacterRepository,
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
      throw new Error(`Skill ${skillId} already exists for character ${characterId}`);
    }
    const skillInfo: any = await this.skillClient.getSkillById(skillId);
    const skillCategoryInfo: any = await this.skillCategoryClient.getSkillCategoryById(skillInfo.categoryId);
    const statistics = [...skillCategoryInfo.bonus, ...skillInfo.bonus];
    //TODO read from api
    const racialBonus: number = 0;
    const skill: CharacterSkill = {
      skillId: command.skillId,
      specialization: command.specialization || null,
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
