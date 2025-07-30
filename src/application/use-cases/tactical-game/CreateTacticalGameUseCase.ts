import { CreateTacticalGameCommand, TacticalGame } from '../../../domain/entities/TacticalGame';
import { Logger } from '../../../domain/ports/Logger';
import { TacticalGameRepository } from '../../../domain/ports/TacticalGameRepository';

export class CreateTacticalGameUseCase {
    constructor(
        private readonly repository: TacticalGameRepository,
        private readonly logger: Logger
    ) { }

    async execute(command: CreateTacticalGameCommand): Promise<TacticalGame> {
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
}
