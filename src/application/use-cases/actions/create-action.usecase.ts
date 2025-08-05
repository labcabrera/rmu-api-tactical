import { inject, injectable } from 'inversify';

import { Action } from '@domain/entities/action.entity';

import { CreateActionCommand } from '@application/commands/create-action.command';
import { Logger } from '@application/ports/logger';
import { ActionRepository } from '@application/ports/outbound/action.repository';
import { CharacterRoundRepository } from '@application/ports/outbound/character-round.repository';
import { CharacterRepository } from '@application/ports/outbound/character.repository';
import { GameRepository } from '@application/ports/outbound/game.repository';
import { TYPES } from '@shared/types';

@injectable()
export class CreateActionUseCase {
  constructor(
    @inject(TYPES.GameRepository) private readonly gameRepository: GameRepository,
    @inject(TYPES.CharacterRepository) private readonly characterRepository: CharacterRepository,
    @inject(TYPES.CharacterRoundRepository) private readonly characterRoundRepository: CharacterRoundRepository,
    @inject(TYPES.ActionRepository) private readonly actionRepository: ActionRepository,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async execute(command: CreateActionCommand): Promise<Action> {
    this.logger.info(`CreateActionUseCase: Creating action ${command.actionType} for character ${command.characterId}`);

    //TODO VALIDATION
    const action: Omit<Action, 'id'> = {
      gameId: command.gameId,
      round: command.round,
      characterId: command.characterId,
      actionType: command.actionType,
      phaseStart: command.phaseStart,
      actionPoints: command.actionPoints,
      createdAt: new Date(),
    };
    return this.actionRepository.save(action);
  }
}
