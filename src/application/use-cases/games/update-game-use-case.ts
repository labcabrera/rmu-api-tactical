import { TacticalGame } from '../../../domain/entities/tactical-game.entity';
import { Logger } from '../../../domain/ports/logger';
import { TacticalGameRepository } from '../../../domain/ports/tactical-game.repository';
import { UpdateGameCommand } from '../../commands/update-game.command';

export class UpdateGameUseCase {
    
    constructor(
        private readonly repository: TacticalGameRepository,
        private readonly logger: Logger,
    ) { }

    async execute(command: UpdateGameCommand): Promise<TacticalGame> {
        this.logger.info(`UpdateTacticalGameUseCase: Updating tactical game << ${command.gameId}`);
        return await this.repository.update(command.gameId, command);
    }
}
