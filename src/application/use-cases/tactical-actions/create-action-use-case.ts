
import { Logger } from '@domain/ports/logger';
import { TacticalCharacterRepository } from '@domain/ports/tactical-character.repository';

import { TacticalAction } from '../../../domain/entities/tactical-action.entity';
import { TacticalActionRepository } from '../../../domain/ports/tactical-action.repository';
import { TacticalCharacterRoundRepository } from '../../../domain/ports/tactical-character-round.repository';
import { TacticalGameRepository } from '../../../domain/ports/tactical-game.repository';
import { CreateActionCommand } from '../../commands/create-action.command';

export class CreateActionUseCase {

    constructor(
        private readonly tacticalGameRepository: TacticalGameRepository,
        private readonly tacticalCharacterRepository: TacticalCharacterRepository,
        private readonly tacticalCharacterRoundRepository: TacticalCharacterRoundRepository,
        private readonly tacticalActionRepository: TacticalActionRepository,
        private readonly logger: Logger
    ) { }

    async execute(command: CreateActionCommand): Promise<TacticalAction> {
        this.logger.info(`CreateActionUseCase: Creating action ${command.actionType} for character ${command.characterId}`);
        
        //TODO VALIDATION
        
        const action: Omit<TacticalAction, 'id'> = {
            gameId: command.gameId,
            round: command.round,
            characterId: command.characterId,
            type: command.actionType,
            phaseStart: command.phaseStart,
            actionPoints: command.actionPoints,
            createdAt: new Date(),
        }
        return this.tacticalActionRepository.create(action);

    }
}