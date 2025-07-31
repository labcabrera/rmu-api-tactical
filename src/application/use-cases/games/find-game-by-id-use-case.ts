import { Game } from "../../../domain/entities/game.entity";
import { GameRepository } from "../../../domain/ports/game.repository";
import { Logger } from "../../../domain/ports/logger";

export class FindGameByIdUseCase {
  constructor(
    private readonly repository: GameRepository,
    private readonly logger: Logger,
  ) {}

  async execute(id: string): Promise<Game> {
    return await this.repository.findById(id);
  }
}
