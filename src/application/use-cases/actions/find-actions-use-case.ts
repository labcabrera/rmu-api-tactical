import { Logger } from '@domain/ports/logger';

import { Page } from '../../../domain/entities/page.entity';
import { TacticalAction } from '../../../domain/entities/tactical-action.entity';
import { TacticalActionRepository } from '../../../domain/ports/tactical-action.repository';
import { TacticalActionQuery } from '../../../domain/queries/tactical-action.query';

export class FindActionsUseCase {

    constructor(
        private readonly tacticalActionRepository: TacticalActionRepository,
        private readonly logger: Logger
    ) { }

    async execute(query: TacticalActionQuery): Promise<Page<TacticalAction>> {
        this.logger.info(`FindActionByIdUseCase: Finding actions`);
        return this.tacticalActionRepository.find(query);
    }
}