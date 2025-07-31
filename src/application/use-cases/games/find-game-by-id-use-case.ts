import { Game } from "../../../domain/entities/game.entity";
import { GameRepository } from "../../../domain/ports/game.repository";

export class FindGameByIdUseCase {
  constructor(private readonly gameRrepository: GameRepository) {}

  async execute(id: string): Promise<Game> {
    return await this.gameRrepository.findById(id);
  }
}
