import { Logger } from '../../../domain/ports/logger';
import { TacticalCharacterRepository } from '../../../domain/ports/tactical-character.repository';
import { TacticalGameRepository } from '../../../domain/ports/tactical-game.repository';

export class DeleteTacticalGameUseCase {
    constructor(
        private readonly tacticalGameRepository: TacticalGameRepository,
        private readonly tacticalCharacterRepository: TacticalCharacterRepository,
        private readonly logger: Logger,
    ) { }

    //TODO delete actions and character rounds
    async execute(gameId: string): Promise<void> {
        this.logger.info(`DeleteTacticalGameUseCase: Deleting tactical game << ${gameId}`);
        await this.tacticalCharacterRepository.deleteByGameId(gameId);
        await this.tacticalGameRepository.delete(gameId);
    }
}
