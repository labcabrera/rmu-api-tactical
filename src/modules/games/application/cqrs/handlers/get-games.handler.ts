import { Inject, Logger } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Page } from '../../../../shared/application/pagination/page.js';
import { Game } from '../../../domain/aggregates/game.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { toGameMongoSort } from '../../../domain/value-objects/game-sort.vo.js';
import { GetGamesQuery } from '../queries/get-games.query.js';
import { GAME_GUARD, type GameGuardPort } from '../../ports/game-guard.port.js';

@QueryHandler(GetGamesQuery)
export class GetGamesHandler implements IQueryHandler<GetGamesQuery, Page<Game>> {
  private readonly logger = new Logger(GetGamesHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(GAME_GUARD) private readonly gameGuard: GameGuardPort,
  ) {}

  async execute(query: GetGamesQuery): Promise<Page<Game>> {
    this.logger.debug(`Finding games with query: ${JSON.stringify(query)}`);
    // Only the games the user can read (spec 021, decision 2).
    const filter = this.gameGuard.buildQueryPredicate(query.userId, query.roles) as Record<string, unknown>;
    return await this.gameRepository.findByRsql(query.rsql, query.page, query.size, filter, toGameMongoSort(query.sort));
  }
}
