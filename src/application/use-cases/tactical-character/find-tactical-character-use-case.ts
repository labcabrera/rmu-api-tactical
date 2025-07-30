import { Page } from '../../../domain/entities/page.entity';
import { TacticalCharacter, TacticalCharacterSearchCriteria } from '../../../domain/entities/tactical-character.entity';
import { Logger } from '../../../domain/ports/logger';
import { TacticalCharacterRepository } from '../../../domain/ports/tactical-character.repository';

export class FindTacticalCharactersUseCase {
    constructor(
        private readonly repository: TacticalCharacterRepository,
        private readonly logger: Logger
    ) { }

    async execute(criteria: TacticalCharacterSearchCriteria): Promise<Page<TacticalCharacter>> {
        this.logger.info(`FindTacticalGamesUseCase: Finding tactical characters with criteria: ${JSON.stringify(criteria)}`);
        const result = await this.repository.find(criteria);
        this.logger.info(`FindTacticalGamesUseCase: Found ${result.total} tactical characters`);
        return result;
    }
}
