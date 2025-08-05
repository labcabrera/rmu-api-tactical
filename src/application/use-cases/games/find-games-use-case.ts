import { inject, injectable } from '@inversifyjs/core';

import { Game } from '../../../domain/entities/game.entity';
import { Page } from '../../../domain/entities/page.entity';
import { GameRepository } from '../../../domain/ports/outbound/game.repository';
import { TYPES } from '../../../shared/types';

@injectable()
export class FindGamesUseCase {
  constructor(@inject(TYPES.GameRepository) private readonly repository: GameRepository) {}

  async execute(rsql: string, page: number, size: number): Promise<Page<Game>> {
    return this.repository.findByRsql(rsql, page, size);
  }
}
