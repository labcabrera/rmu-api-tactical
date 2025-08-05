import { inject, injectable } from 'inversify';

import { Game } from '@domain/entities/game.entity';
import { NotFoundError } from '@domain/errors/errors';

import { GameRepository } from '@application/ports/outbound/game.repository';
import { TYPES } from '@shared/types';

@injectable()
export class FindGameByIdUseCase {
  constructor(
    @inject(TYPES.GameRepository)
    private readonly gameRepository: GameRepository
  ) {}

  async execute(id: string): Promise<Game> {
    const result = await this.gameRepository.findById(id);
    if (!result) {
      throw new NotFoundError('Game', id);
    }
    return result;
  }
}
