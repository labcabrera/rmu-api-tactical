import { Character, CharacterSkill } from "@domain/entities/character.entity";
import { Logger } from "@domain/ports/logger";
import { CharacterRepository } from "@domain/ports/outbound/character.repository";
import { SkillCategoryClient } from "@domain/ports/outbound/skill-category-client";
import { SkillClient } from "@domain/ports/outbound/skill-client";

import { AddSkillCommand } from "@application/commands/add-skill.command";
import { CharacterProcessorService } from "@domain/services/character-processor.service";

export class AddSkillUseCase {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    private readonly characterRepository: CharacterRepository,
    private readonly skillClient: SkillClient,
    private readonly skillCategoryClient: SkillCategoryClient,
    private readonly logger: Logger,
  ) {}

  async execute(command: AddSkillCommand): Promise<Character> {
    try {
      this.logger.info(
        `AddSkillUseCase: Adding skill ${command.skillId} to character ${command.characterId} with ${command.ranks} ranks and ${command.customBonus} custom bonus`,
      );
      const characterId = command.characterId;
      const skillId = command.skillId;
      const character: Character =
        await this.characterRepository.findById(characterId);
      if (this.hasSkillId(character, skillId)) {
        throw new Error(
          `Skill ${skillId} already exists for character ${characterId}`,
        );
      }
      const skillInfo: any = await this.skillClient.getSkillById(skillId);
      const skillCategoryInfo: any =
        await this.skillCategoryClient.getSkillCategoryById(
          skillInfo.categoryId,
        );
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
      const updated: Character = await this.characterRepository.update(
        characterId,
        character,
      );
      return updated;
    } catch (error: any) {
      this.logger.error(
        `AddSkillUseCase: Error adding skill to tactical character ${command.characterId}: ${error.message}`,
      );
      throw new Error(
        `Error adding skill to tactical character ${command.characterId}: ${error.message}`,
      );
    }
  }

  private hasSkillId(character: Character, skillId: string): boolean {
    return character.skills.some((skill) => skill.skillId === skillId);
  }
}
