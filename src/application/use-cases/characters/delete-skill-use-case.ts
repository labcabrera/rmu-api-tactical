import { TacticalCharacter } from '@domain/entities/tactical-character.entity';
import { Logger } from '@domain/ports/logger';
import { TacticalCharacterRepository } from '@domain/ports/tactical-character.repository';
import { CharacterProcessorService } from '@domain/services/character-processor.service';

import { DeleteSkillCommand } from '@application/commands/delete-skill-command';

export class DeleteSkillUseCase {

    constructor(
        private readonly characterProcessorService: CharacterProcessorService,
        private readonly tacticalCharacterRepository: TacticalCharacterRepository,
        private readonly logger: Logger
    ) { }

    async execute(command: DeleteSkillCommand): Promise<TacticalCharacter> {
        try {
            this.logger.info(`DeleteSkillUseCase: Deleting skill ${command.skillId} for character ${command.characterId}`);
            const characterId = command.characterId;
            const skillId = command.skillId;
            const character: TacticalCharacter = await this.tacticalCharacterRepository.findById(characterId);
            const skill = character.skills.find(skill => skill.skillId === skillId) || null;
            if (!skill) {
                throw new Error(`Skill ${skillId} not found for character ${characterId}`);
            }
            character.skills = character.skills.filter(skill => skill.skillId !== skillId);
            this.characterProcessorService.process(character);
            const updated: TacticalCharacter = await this.tacticalCharacterRepository.update(characterId, character);
            return updated;
        }catch (error: any) {
            this.logger.error(`DeleteSkillUseCase: Error deleting skill from tactical character ${command.characterId}: ${error.message}`);
            throw new Error(`Error deleting skill from tactical character ${command.characterId}: ${error.message}`);
        }
    }

}