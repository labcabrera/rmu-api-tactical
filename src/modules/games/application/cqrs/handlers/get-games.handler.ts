import { Inject, Logger } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Page } from '../../../../shared/application/pagination/page.js';
import { Game } from '../../../domain/aggregates/game.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { toGameMongoSort } from '../../../domain/value-objects/game-sort.vo.js';
import { GetGamesQuery } from '../queries/get-games.query.js';

@QueryHandler(GetGamesQuery)
export class GetGamesHandler implements IQueryHandler<GetGamesQuery, Page<Game>> {
  private readonly logger = new Logger(GetGamesHandler.name);

  constructor(@Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository) {}

  async execute(query: GetGamesQuery): Promise<Page<Game>> {
    this.logger.debug(`Finding games with query: ${JSON.stringify(query)}`);
    return await this.gameRepository.findByRsql(query.rsql, query.page, query.size, undefined, toGameMongoSort(query.sort));
  }
}
