import { Page } from '../../../domain/entities/page.entity';
import { TacticalCharacter } from '../../../domain/entities/tactical-character.entity';
import { Logger } from '../../../domain/ports/logger';
import { TacticalCharacterRepository } from '../../../domain/ports/tactical-character.repository';
import { TacticalCharacterQuery } from '../../../domain/queries/tactical-character.query';

export class FindCharactersUseCase {
    constructor(
        private readonly repository: TacticalCharacterRepository,
        private readonly logger: Logger
    ) { }

    async execute(criteria: TacticalCharacterQuery): Promise<Page<TacticalCharacter>> {
        this.logger.info(`FindTacticalCharactersUseCase: Finding tactical characters with criteria: ${JSON.stringify(criteria)}`);
        return await this.repository.find(criteria);
    }

}
