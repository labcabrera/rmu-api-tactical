import { TacticalGame } from '../../../domain/entities/tactical-game.entity';
import { Logger } from '../../../domain/ports/logger';
import { TacticalGameRepository } from '../../../domain/ports/tactical-game.repository';
import { UpdateTacticalGameCommand } from '../../commands/update-tactical-game-command';

export class UpdateTacticalGameUseCase {
    
    constructor(
        private readonly repository: TacticalGameRepository,
        private readonly logger: Logger,
    ) { }

    async execute(command: UpdateTacticalGameCommand): Promise<TacticalGame> {
        this.logger.info(`UpdateTacticalGameUseCase: Updating tactical game << ${command.gameId}`);
        return await this.repository.update(command.gameId, command);
    }
}
