import { Character } from "@domain/entities/character.entity";
import { CharacterRepository } from "@domain/ports/character.repository";
import { Logger } from "@domain/ports/logger";
import { CharacterProcessorService } from "@domain/services/character-processor.service";

import { UpdateSkillCommand } from "@application/commands/update-skill.command";

export class UpdateSkillUseCase {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    private readonly characterRepository: CharacterRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: UpdateSkillCommand): Promise<Character> {
    try {
      this.logger.info(
        `UpdateSkillUseCase: Updating skill ${command.skillId} for character ${command.characterId}`,
      );
      const characterId = command.characterId;
      const skillId = command.skillId;
      const character: Character =
        await this.characterRepository.findById(characterId);
      const skill =
        character.skills.find((skill) => skill.skillId === skillId) || null;
      if (!skill) {
        throw new Error(
          `Skill ${skillId} not found for character ${characterId}`,
        );
      }
      skill.ranks = command.ranks || skill.ranks;
      skill.customBonus = command.customBonus || skill.customBonus;
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
}
