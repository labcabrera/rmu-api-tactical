import { TacticalCharacter, UpdateTacticalCharacterCommand } from '../../../domain/entities/tactical-character.entity';
import { Logger } from '../../../domain/ports/logger';
import { TacticalCharacterRepository } from '../../../domain/ports/tactical-character.repository';

export class UpdateTacticalCharacterUseCase {
    constructor(
        private tacticalCharacterRepository: TacticalCharacterRepository,
        private logger: Logger
    ) { }

    async execute(characterId: string, command: UpdateTacticalCharacterCommand): Promise<TacticalCharacter> {
        this.logger.info(`Updating tactical character: ${characterId}`);
        const existingCharacter = await this.tacticalCharacterRepository.findById(characterId);
        if (!existingCharacter) {
            const error = new Error('Tactical character not found');
            (error as any).status = 404;
            throw error;
        }
        const updatedCharacter = null; //await this.tacticalCharacterRepository.update(characterId, cmd);
        if (!updatedCharacter) {
            const error = new Error('Failed to update tactical character');
            (error as any).status = 500;
            throw error;
        }

        this.logger.info(`Tactical character updated successfully: ${characterId}`);
        return updatedCharacter;
    }
}
