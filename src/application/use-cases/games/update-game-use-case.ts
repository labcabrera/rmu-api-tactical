import { Game } from "../../../domain/entities/game.entity";
import { GameRepository } from "../../../domain/ports/game.repository";
import { Logger } from "../../../domain/ports/logger";
import { UpdateGameCommand } from "../../commands/update-game.command";

export class UpdateGameUseCase {
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: UpdateGameCommand): Promise<Game> {
    this.logger.info(
      `UpdateTacticalGameUseCase: Updating tactical game << ${command.gameId}`,
    );
    return await this.gameRepository.update(command.gameId, command);
  }
}
