import { Game } from "../../../domain/entities/game.entity";
import { Page } from "../../../domain/entities/page.entity";
import { GameRepository } from "../../../domain/ports/game.repository";
import { GameQuery } from "../../../domain/queries/game.query";

export class FindGamesUseCase {
  constructor(private readonly repository: GameRepository) {}

  async execute(criteria: GameQuery): Promise<Page<Game>> {
    return await this.repository.find(criteria);
  }
}
