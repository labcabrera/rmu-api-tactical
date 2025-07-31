import { Page } from '../../../domain/entities/page.entity';
import { TacticalGame } from '../../../domain/entities/tactical-game.entity';
import { Logger } from '../../../domain/ports/logger';
import { TacticalGameRepository } from '../../../domain/ports/tactical-game.repository';
import { TacticalGameQuery } from '../../../domain/queries/tactical-game.query';

export class FindGamesUseCase {
    constructor(
        private readonly repository: TacticalGameRepository,
        private readonly logger: Logger
    ) { }

    async execute(criteria: TacticalGameQuery): Promise<Page<TacticalGame>> {
        return await this.repository.find(criteria);
    }
}
