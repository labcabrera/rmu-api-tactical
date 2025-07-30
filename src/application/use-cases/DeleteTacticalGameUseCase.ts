import { Logger } from '../../domain/ports/Logger';
import { TacticalGameRepository } from '../../domain/ports/TacticalGameRepository';
import { FindTacticalGameByIdUseCase } from './FindTacticalGameByIdUseCase';

export class DeleteTacticalGameUseCase {
    constructor(
        private readonly repository: TacticalGameRepository,
        private readonly logger: Logger,
        private readonly findByIdUseCase: FindTacticalGameByIdUseCase
    ) { }

    async execute(id: string): Promise<void> {
        this.logger.info(`Deleting tactical game with ID: ${id}`);

        // Verificar que el juego existe
        await this.findByIdUseCase.execute(id);

        const deleted = await this.repository.delete(id);
        if (!deleted) {
            this.logger.error(`Failed to delete tactical game with ID: ${id}`);
            const error = new Error('Failed to delete tactical game');
            (error as any).status = 500;
            throw error;
        }

        this.logger.info(`Deleted tactical game with ID: ${id}`);
    }
}
