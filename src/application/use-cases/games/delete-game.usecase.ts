import { inject, injectable } from 'inversify';
import { Logger } from '../../../domain/ports/logger';
import { CharacterRepository } from '../../../domain/ports/outbound/character.repository';
import { GameRepository } from '../../../domain/ports/outbound/game.repository';
import { TYPES } from '../../../shared/types';

@injectable()
export class DeleteGameUseCase {
  constructor(
    @inject(TYPES.GameRepository)
    private readonly gameRepository: GameRepository,
    @inject(TYPES.CharacterRepository)
    private readonly characterRepository: CharacterRepository,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  //TODO delete actions and character rounds
  async execute(gameId: string): Promise<void> {
    this.logger.info(`DeleteTacticalGameUseCase: Deleting tactical game << ${gameId}`);
    await this.characterRepository.deleteByGameId(gameId);
    await this.gameRepository.deleteById(gameId);
  }
}
