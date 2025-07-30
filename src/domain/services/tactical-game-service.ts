import { UpdateTacticalGameCommand } from '../../application/commands/update-tactical-game-command';
import {
    TacticalGame,
} from '../entities/tactical-game.entity';
import { Logger } from '../ports/logger';
import { TacticalGameRepository } from '../ports/tactical-game.repository';

export class TacticalGameService {
    constructor(
        private readonly repository: TacticalGameRepository,
        private readonly logger: Logger
    ) { }

    async findById(id: string): Promise<TacticalGame> {
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

    async update(id: string, command: UpdateTacticalGameCommand): Promise<TacticalGame> {
        this.logger.info(`Updating tactical game ${id} with data: ${JSON.stringify(command)}`);
        await this.findById(id);
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

    async delete(id: string): Promise<void> {
        this.logger.info(`Deleting tactical game with ID: ${id}`);

        // Verificar que el juego existe
        await this.findById(id);

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
