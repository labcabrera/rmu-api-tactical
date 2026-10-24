import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Page } from '../../../../shared/application/pagination/page';
import { Game } from '../../../domain/aggregates/game';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port';
import { toGameMongoSort } from '../../../domain/value-objects/game-sort.vo';
import { GetGamesQuery } from '../queries/get-games.query';

@QueryHandler(GetGamesQuery)
export class GetGamesHandler implements IQueryHandler<GetGamesQuery, Page<Game>> {
  private readonly logger = new Logger(GetGamesHandler.name);

  constructor(@Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository) {}

  async execute(query: GetGamesQuery): Promise<Page<Game>> {
    this.logger.debug(`Finding games with query: ${JSON.stringify(query)}`);
    return await this.gameRepository.findByRsql(query.rsql, query.page, query.size, undefined, toGameMongoSort(query.sort));
  }
}
