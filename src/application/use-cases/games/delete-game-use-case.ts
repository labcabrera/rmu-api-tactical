import { Logger } from "../../../domain/ports/logger";
import { CharacterRepository } from "../../../domain/ports/outbound/character.repository";
import { GameRepository } from "../../../domain/ports/outbound/game.repository";

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
