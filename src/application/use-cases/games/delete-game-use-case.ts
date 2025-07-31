import { CharacterRepository } from "../../../domain/ports/character.repository";
import { GameRepository } from "../../../domain/ports/game.repository";
import { Logger } from "../../../domain/ports/logger";

export class DeleteGameUseCase {
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly characterRepository: CharacterRepository,
    private readonly logger: Logger,
  ) {}

  //TODO delete actions and character rounds
  async execute(gameId: string): Promise<void> {
    this.logger.info(
      `DeleteTacticalGameUseCase: Deleting tactical game << ${gameId}`,
    );
    await this.characterRepository.deleteByGameId(gameId);
    await this.gameRepository.delete(gameId);
  }
}
