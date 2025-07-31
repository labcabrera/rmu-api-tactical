import { Page } from '../../../domain/entities/page.entity';
import { TacticalCharacterRound } from '../../../domain/entities/tactical-character-round.entity';
import { Logger } from '../../../domain/ports/logger';
import { TacticalCharacterRoundRepository } from '../../../domain/ports/tactical-character-round.repository';
import { TacticalCharacterRoundQuery } from '../../../domain/queries/tactical-character-round.query';

export class FindCharacterRoundsUseCase {
    constructor(
        private readonly repository: TacticalCharacterRoundRepository,
        private readonly logger: Logger
    ) { }

    async execute(criteria: TacticalCharacterRoundQuery): Promise<Page<TacticalCharacterRound>> {
        this.logger.info(`FindTacticalCharacterRoundsUseCase: Finding tactical character rounds`);
        return await this.repository.find(criteria);
    }

}
