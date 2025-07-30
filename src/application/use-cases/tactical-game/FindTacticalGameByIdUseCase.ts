import { TacticalGame } from '../../../domain/entities/tactical-game.entity';
import { Logger } from '../../../domain/ports/Logger';
import { TacticalGameRepository } from '../../../domain/ports/TacticalGameRepository';

export class FindTacticalGameByIdUseCase {
    constructor(
        private readonly repository: TacticalGameRepository,
        private readonly logger: Logger
    ) { }

    async execute(id: string): Promise<TacticalGame> {
        this.logger.info(`Finding tactical game by ID: ${id}`);

        const game = await this.repository.findById(id);
        if (!game) {
            this.logger.error(`Tactical game not found with ID: ${id}`);
            const error = new Error('Tactical game not found');
            (error as any).status = 404;
            throw error;
        }

        this.logger.info(`Found tactical game: ${game.name}`);
        return game;
    }
}
