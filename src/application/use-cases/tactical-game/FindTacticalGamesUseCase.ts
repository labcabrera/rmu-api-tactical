import { Page } from '../../../domain/entities/page.entity';
import { TacticalGame, TacticalGameSearchCriteria } from '../../../domain/entities/tactical-game.entity';
import { Logger } from '../../../domain/ports/logger';
import { TacticalGameRepository } from '../../../domain/ports/tactical-game.repository';

export class FindTacticalGamesUseCase {
    constructor(
        private readonly repository: TacticalGameRepository,
        private readonly logger: Logger
    ) { }

    async execute(criteria: TacticalGameSearchCriteria): Promise<Page<TacticalGame>> {
        this.logger.info(`Finding tactical games with criteria: ${JSON.stringify(criteria)}`);

        const result = await this.repository.find(criteria);

        this.logger.info(`Found ${result.total} tactical games`);
        return result;
    }
}
