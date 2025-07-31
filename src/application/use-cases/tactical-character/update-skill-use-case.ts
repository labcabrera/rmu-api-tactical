import { TacticalCharacter } from '@domain/entities/tactical-character.entity';
import { Logger } from '@domain/ports/logger';
import { TacticalCharacterRepository } from '@domain/ports/tactical-character.repository';
import { CharacterProcessorService } from '@domain/services/character-processor.service';

import { UpdateSkillCommand } from '@application/commands/update-skill.command';

export class UpdateSkillUseCase {

    constructor(
        private readonly characterProcessorService: CharacterProcessorService,
        private readonly tacticalCharacterRepository: TacticalCharacterRepository,
        private readonly logger: Logger
    ) { }

    async execute(command: UpdateSkillCommand): Promise<TacticalCharacter> {
        try {
            this.logger.info(`UpdateSkillUseCase: Updating skill ${command.skillId} for character ${command.characterId}`);
            const characterId = command.characterId;
            const skillId = command.skillId;
            const character: TacticalCharacter = await this.tacticalCharacterRepository.findById(characterId);
            const skill = character.skills.find(skill => skill.skillId === skillId) || null;
            if (!skill) {
                throw new Error(`Skill ${skillId} not found for character ${characterId}`);
            }
            skill.ranks = command.ranks || skill.ranks;
            skill.customBonus = command.customBonus || skill.customBonus;
            this.characterProcessorService.process(character);
            const updated: TacticalCharacter = await this.tacticalCharacterRepository.update(characterId, character);
            return updated;
        }catch (error: any) {
            this.logger.error(`AddSkillUseCase: Error adding skill to tactical character ${command.characterId}: ${error.message}`);
            throw new Error(`Error adding skill to tactical character ${command.characterId}: ${error.message}`);
        }
    }

}