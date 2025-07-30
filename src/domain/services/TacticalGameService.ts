import {
    CreateTacticalGameCommand,
    PaginatedTacticalGames,
    TacticalGame,
    TacticalGameSearchCriteria,
    UpdateTacticalGameCommand
} from '../entities/TacticalGame';
import { Logger } from '../ports/Logger';
import { TacticalGameRepository } from '../ports/TacticalGameRepository';

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

    async find(criteria: TacticalGameSearchCriteria): Promise<PaginatedTacticalGames> {
        this.logger.info(`Finding tactical games with criteria: ${JSON.stringify(criteria)}`);

        const result = await this.repository.find(criteria);

        this.logger.info(`Found ${result.total} tactical games`);
        return result;
    }

    async create(command: CreateTacticalGameCommand): Promise<TacticalGame> {
        this.logger.info(`Creating tactical game: ${command.name} for user: ${command.user}`);

        // Aplicar reglas de negocio
        let factions = command.factions || [];
        if (!factions || factions.length === 0) {
            factions = ['Light', 'Evil', 'Neutral'];
        }

        const newGame: TacticalGame = {
            user: command.user,
            name: command.name,
            ...(command.description && { description: command.description }),
            status: 'created',
            factions,
            round: 0
        };

        const savedGame = await this.repository.save(newGame);

        this.logger.info(`Created tactical game with ID: ${savedGame.id}`);
        return savedGame;
    }

    async update(id: string, command: UpdateTacticalGameCommand): Promise<TacticalGame> {
        this.logger.info(`Updating tactical game ${id} with data: ${JSON.stringify(command)}`);

        // Verificar que el juego existe
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
