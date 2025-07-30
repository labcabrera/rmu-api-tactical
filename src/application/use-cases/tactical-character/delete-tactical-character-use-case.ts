import { Logger } from '../../../domain/ports/logger';
import { TacticalCharacterRepository } from '../../../domain/ports/tactical-character.repository';

export class DeleteTacticalCharacterUseCase {
    constructor(
        private tacticalCharacterRepository: TacticalCharacterRepository,
        private logger: Logger
    ) { }

    async execute(characterId: string): Promise<void> {
        this.logger.info(`DeleteTacticalCharacterUseCase: Deleting tactical character: ${characterId}`);
        await this.tacticalCharacterRepository.delete(characterId);
    }
}
