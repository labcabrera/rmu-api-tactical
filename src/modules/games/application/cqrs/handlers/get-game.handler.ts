import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors';
import { Game } from '../../../domain/entities/game.aggregate';
import type { GameRepository } from '../../ports/game.repository';
import { GetGameQuery } from '../../queries/get-game.query';

@QueryHandler(GetGameQuery)
export class GetGameHandler implements IQueryHandler<GetGameQuery, Game> {
  private readonly logger = new Logger(GetGameHandler.name);

  constructor(@Inject('GameRepository') private readonly gameRepository: GameRepository) {}

  async execute(query: GetGameQuery): Promise<Game> {
    this.logger.debug(`Execute << ${query.gameId}`);
    const data = await this.gameRepository.findById(query.gameId);
    if (!data) {
      throw new NotFoundError('Game', query.gameId);
    }
    return data;
  }
}
