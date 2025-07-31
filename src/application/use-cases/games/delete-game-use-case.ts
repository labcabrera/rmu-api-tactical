import { CharacterRepository } from "../../../domain/ports/character.repository";
import { GameRepository } from "../../../domain/ports/game.repository";
import { Logger } from "../../../domain/ports/logger";

export class DeleteGameUseCase {
  constructor(
    private readonly tacticalGameRepository: GameRepository,
    private readonly tacticalCharacterRepository: CharacterRepository,
    private readonly logger: Logger,
  ) {}

  //TODO delete actions and character rounds
  async execute(gameId: string): Promise<void> {
    this.logger.info(
      `DeleteTacticalGameUseCase: Deleting tactical game << ${gameId}`,
    );
    await this.tacticalCharacterRepository.deleteByGameId(gameId);
    await this.tacticalGameRepository.delete(gameId);
  }
}
