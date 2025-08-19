import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { NotFoundError } from '../../../../shared/domain/errors';
import { Game } from '../../../domain/entities/game.entity';
import * as gameRepository from '../../ports/out/game.repository';
import { GetGameQuery } from '../get-game.query';

@QueryHandler(GetGameQuery)
export class GetGameQueryHandler implements IQueryHandler<GetGameQuery, Game> {
  constructor(@Inject('GameRepository') private readonly gameRepository: gameRepository.GameRepository) {}

  async execute(query: GetGameQuery): Promise<Game> {
    const data = await this.gameRepository.findById(query.gameId);
    if (!data) {
      throw new NotFoundError('Game', query.gameId);
    }
    return data;
  }
}
