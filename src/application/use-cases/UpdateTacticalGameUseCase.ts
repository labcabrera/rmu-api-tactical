import { TacticalGame } from '../../domain/entities/tactical-game.entity';
import { Logger } from '../../domain/ports/logger';
import { TacticalGameRepository } from '../../domain/ports/tactical-game.repository';
import { UpdateTacticalGameCommand } from '../commands/update-tactical-game-command';
import { FindTacticalGameByIdUseCase } from './tactical-game/FindTacticalGameByIdUseCase';

export class UpdateTacticalGameUseCase {
    constructor(
        private readonly repository: TacticalGameRepository,
        private readonly logger: Logger,
        private readonly findByIdUseCase: FindTacticalGameByIdUseCase
    ) { }

    async execute(id: string, command: UpdateTacticalGameCommand): Promise<TacticalGame> {
        this.logger.info(`Updating tactical game ${id} with data: ${JSON.stringify(command)}`);

        // Verificar que el juego existe
        await this.findByIdUseCase.execute(id);

        const updatedGame = await this.repository.update(id, command);
        if (!updatedGame) {
            this.logger.error(`Failed to update tactical game with ID: ${id}`);
            const error = new Error('Failed to update tactical game');
            (error as any).status = 500;
            throw error;
        }

        this.logger.info(`Updated tactical game: ${updatedGame.name}`);
        return updatedGame;
    }
}
