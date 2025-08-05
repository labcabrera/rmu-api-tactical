import { inject, injectable } from '@inversifyjs/core';

import { Game } from "../../../domain/entities/game.entity";
import { Page } from "../../../domain/entities/page.entity";
import { GameRepository } from "../../../domain/ports/outbound/game.repository";
import { GameQuery } from "../../../domain/queries/game.query";
import { TYPES } from '../../../shared/types';

@injectable()
export class FindGamesUseCase {
  constructor(@inject(TYPES.GameRepository) private readonly repository: GameRepository) {}

  async execute(criteria: GameQuery): Promise<Page<Game>> {
    return await this.repository.find(criteria);
  }
}
