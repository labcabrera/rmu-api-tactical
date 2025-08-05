import { inject, injectable } from '@inversifyjs/core';
import { Game } from "../../../domain/entities/game.entity";
import { GameRepository } from "../../../domain/ports/outbound/game.repository";
import { TYPES } from '../../../shared/types';

@injectable()
export class FindGameByIdUseCase {
  constructor(@inject(TYPES.GameRepository) private readonly gameRepository: GameRepository) {}

  async execute(id: string): Promise<Game> {
    return await this.gameRepository.findById(id);
  }
}
