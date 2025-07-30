import { Logger } from '../../domain/ports/Logger';
import { TacticalCharacterRepository } from '../../domain/ports/TacticalCharacterRepository';

export class DeleteTacticalCharacterUseCase {
    constructor(
        private tacticalCharacterRepository: TacticalCharacterRepository,
        private logger: Logger
    ) { }

    async execute(characterId: string): Promise<void> {
        this.logger.info(`Deleting tactical character: ${characterId}`);

        // Verify character exists
        const existingCharacter = await this.tacticalCharacterRepository.findById(characterId);
        if (!existingCharacter) {
            const error = new Error('Tactical character not found');
            (error as any).status = 404;
            throw error;
        }

        // Delete character
        const deleted = await this.tacticalCharacterRepository.delete(characterId);
        if (!deleted) {
            const error = new Error('Failed to delete tactical character');
            (error as any).status = 500;
            throw error;
        }

        this.logger.info(`Tactical character deleted successfully: ${characterId}`);
    }
}
