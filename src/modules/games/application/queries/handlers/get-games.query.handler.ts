import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { Page } from '../../../../shared/domain/entities/page.entity';
import { Game } from '../../../domain/entities/game.entity';
import * as gameRepository from '../../ports/out/game.repository';
import { GetGamesQuery } from '../get-games.query';

@QueryHandler(GetGamesQuery)
export class GetGamesQueryHandler implements IQueryHandler<GetGamesQuery, Page<Game>> {
  private readonly logger = new Logger(GetGamesQueryHandler.name);

  constructor(@Inject('GameRepository') private readonly gameRepository: gameRepository.GameRepository) {}

  async execute(query: GetGamesQuery): Promise<Page<Game>> {
    this.logger.debug('Finding games with query: ', query.rsql);
    return await this.gameRepository.findByRsql(query.rsql, query.page, query.size);
  }
}
