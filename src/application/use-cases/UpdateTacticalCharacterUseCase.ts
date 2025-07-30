import { TacticalCharacterEntity, UpdateTacticalCharacterCommand } from '../../domain/entities/TacticalCharacter';
import { Logger } from '../../domain/ports/Logger';
import { TacticalCharacterRepository } from '../../domain/ports/TacticalCharacterRepository';

export class UpdateTacticalCharacterUseCase {
    constructor(
        private tacticalCharacterRepository: TacticalCharacterRepository,
        private logger: Logger
    ) { }

    async execute(characterId: string, command: UpdateTacticalCharacterCommand): Promise<TacticalCharacterEntity> {
        this.logger.info(`Updating tactical character: ${characterId}`);

        // Verify character exists
        const existingCharacter = await this.tacticalCharacterRepository.findById(characterId);
        if (!existingCharacter) {
            const error = new Error('Tactical character not found');
            (error as any).status = 404;
            throw error;
        }

        // Update character
        const updatedCharacter = await this.tacticalCharacterRepository.update(characterId, command);
        if (!updatedCharacter) {
            const error = new Error('Failed to update tactical character');
            (error as any).status = 500;
            throw error;
        }

        this.logger.info(`Tactical character updated successfully: ${characterId}`);
        return updatedCharacter;
    }
}
