import { Logger } from '@domain/ports/logger';

import { TacticalAction } from '../../../domain/entities/tactical-action.entity';
import { TacticalActionRepository } from '../../../domain/ports/tactical-action.repository';

export class FindActionByIdUseCase {

    constructor(
        private readonly tacticalActionRepository: TacticalActionRepository,
        private readonly logger: Logger
    ) { }

    async execute(actionId: string): Promise<TacticalAction> {
        this.logger.info(`FindActionByIdUseCase: Finding action << ${actionId}`);
        return this.tacticalActionRepository.findById(actionId);
    }
}