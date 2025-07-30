import { PaginatedTacticalGames, TacticalGameSearchCriteria } from '../../../domain/entities/tactical-game.entity';
import { Logger } from '../../../domain/ports/Logger';
import { TacticalGameRepository } from '../../../domain/ports/TacticalGameRepository';

export class FindTacticalGamesUseCase {
    constructor(
        private readonly repository: TacticalGameRepository,
        private readonly logger: Logger
    ) { }

    async execute(criteria: TacticalGameSearchCriteria): Promise<PaginatedTacticalGames> {
        this.logger.info(`Finding tactical games with criteria: ${JSON.stringify(criteria)}`);

        const result = await this.repository.find(criteria);

        this.logger.info(`Found ${result.total} tactical games`);
        return result;
    }
}
