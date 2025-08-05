import { Character } from "@/domain/entities/character.entity";
import { CharacterRepository } from "@/domain/ports/character.repository";
import { Logger } from "@domain/ports/logger";
import { CharacterProcessorService } from "@domain/services/character-processor.service";

import { DeleteSkillCommand } from "@application/commands/delete-skill-command";

export class DeleteSkillUseCase {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    private readonly characterRepository: CharacterRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: DeleteSkillCommand): Promise<Character> {
    try {
      this.logger.info(
        `DeleteSkillUseCase: Deleting skill << ${command.skillId} for character ${command.characterId}`,
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
      character.skills = character.skills.filter(
        (skill) => skill.skillId !== skillId,
      );
      this.characterProcessorService.process(character);
      const updated: Character = await this.characterRepository.update(
        characterId,
        character,
      );
      return updated;
    } catch (error: any) {
      this.logger.error(
        `DeleteSkillUseCase: Error deleting skill from tactical character ${command.characterId}: ${error.message}`,
      );
      throw new Error(
        `Error deleting skill from tactical character ${command.characterId}: ${error.message}`,
      );
    }
  }
}
