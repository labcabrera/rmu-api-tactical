
import { TacticalCharacter } from '@domain/entities/tactical-character.entity';
import { Logger } from '@domain/ports/logger';
import { TacticalCharacterRepository } from '@domain/ports/tactical-character.repository';

import { AddSkillCommand } from '@application/commands/add-skill.command';

export class AddSkillUseCase {

    constructor(
        private readonly tacticalCharacterRepository: TacticalCharacterRepository,
        private readonly logger: Logger
    ) { }

    async execute(command: AddSkillCommand): Promise<TacticalCharacter> {
        this.logger.info(`AddSkillUseCase: Adding skill ${command.skillId} to character ${command.characterId}`);
        const characterId = command.characterId;
        const character: TacticalCharacter = await this.tacticalCharacterRepository.findById(command.characterId);

        //TODO
        return character;
    }
 

    
}
