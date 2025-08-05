import { inject, injectable } from 'inversify';

import { Game } from '@domain/entities/game.entity';
import { Logger } from '@domain/ports/logger';
import { GameRepository } from '@domain/ports/outbound/game.repository';

import { UpdateGameCommand } from '@application/commands/update-game.command';
import { TYPES } from '@shared/types';

@injectable()
export class UpdateGameUseCase {
  constructor(
    @inject(TYPES.GameRepository)
    private readonly gameRepository: GameRepository,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async execute(command: UpdateGameCommand): Promise<Game> {
    this.logger.info(`UpdateTacticalGameUseCase: Updating tactical game << ${command.gameId}`);
    return await this.gameRepository.update(command.gameId, command);
  }
}
