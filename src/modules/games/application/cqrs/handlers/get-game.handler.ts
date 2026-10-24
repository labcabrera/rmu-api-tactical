import { Inject, Logger } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { Game } from '../../../domain/aggregates/game.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { GetGameQuery } from '../queries/get-game.query.js';

@QueryHandler(GetGameQuery)
export class GetGameHandler implements IQueryHandler<GetGameQuery, Game> {
  private readonly logger = new Logger(GetGameHandler.name);

  constructor(@Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository) {}

  async execute(query: GetGameQuery): Promise<Game> {
    this.logger.debug(`Execute << ${query.gameId}`);
    const data = await this.gameRepository.findById(query.gameId);
    if (!data) {
      throw new NotFoundError('Game', query.gameId);
    }
    return data;
  }
}
