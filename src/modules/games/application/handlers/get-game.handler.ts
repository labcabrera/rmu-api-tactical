import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../shared/domain/errors';
import { Game } from '../../domain/entities/game.aggregate';
import * as gr from '../ports/game.repository';
import { GetGameQuery } from '../queries/get-game.query';

@QueryHandler(GetGameQuery)
export class GetGameQueryHandler implements IQueryHandler<GetGameQuery, Game> {
  constructor(@Inject('GameRepository') private readonly gameRepository: gr.GameRepository) {}

  async execute(query: GetGameQuery): Promise<Game> {
    const data = await this.gameRepository.findById(query.gameId);
    if (!data) {
      throw new NotFoundError('Game', query.gameId);
    }
    return data;
  }
}
