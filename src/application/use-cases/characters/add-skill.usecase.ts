import { inject, injectable } from 'inversify';

import { Character, CharacterSkill } from '@domain/entities/character.entity';
import { NotFoundError } from '@domain/errors/errors';
import { CharacterProcessorService } from '@domain/services/character-processor.service';

import { AddSkillCommand } from '@application/commands/add-skill.command';
import { Logger } from '@application/ports/logger';
import { CharacterRepository } from '@application/ports/outbound/character.repository';
import { SkillCategoryClient } from '@application/ports/outbound/skill-category-client';
import { SkillClient } from '@application/ports/outbound/skill-client';
import { TYPES } from '@shared/types';

@injectable()
export class AddSkillUseCase {
  constructor(
    @inject(TYPES.CharacterProcessorService) private readonly characterProcessorService: CharacterProcessorService,
    @inject(TYPES.CharacterRepository) private readonly characterRepository: CharacterRepository,
    @inject(TYPES.SkillClient) private readonly skillClient: SkillClient,
    @inject(TYPES.SkillCategoryClient) private readonly skillCategoryClient: SkillCategoryClient,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async execute(command: AddSkillCommand): Promise<Character> {
    try {
      this.logger.info(
        `AddSkillUseCase: Adding skill ${command.skillId} to character ${command.characterId} with ${command.ranks} ranks and ${command.customBonus} custom bonus`
      );
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
    } catch (error: any) {
      this.logger.error(
        `AddSkillUseCase: Error adding skill to tactical character ${command.characterId}: ${error.message}`
      );
      throw new Error(`Error adding skill to tactical character ${command.characterId}: ${error.message}`);
    }
  }

  private hasSkillId(character: Character, skillId: string): boolean {
    return character.skills.some(skill => skill.skillId === skillId);
  }
}
