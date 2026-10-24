import { Inject, Logger } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Page } from '../../../../shared/application/pagination/page.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { GetActorsRoundsQuery as GetActorRoundsQuery } from '../queries/get-actor-rounds.query.js';
import { GAME_GUARD, type GameGuardPort } from '../../../../games/application/ports/game-guard.port.js';
import { GAME_REPOSITORY, type GameRepository } from '../../../../games/application/ports/game-repository.port.js';
import { readableGamesFilter } from '../../../../games/application/services/readable-games.js';

@QueryHandler(GetActorRoundsQuery)
export class GetActorRoundsHandler implements IQueryHandler<GetActorRoundsQuery, Page<ActorRound>> {
  private readonly logger = new Logger(GetActorRoundsHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly characterRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(GAME_GUARD) private readonly gameGuard: GameGuardPort,
  ) {}

  async execute(query: GetActorRoundsQuery): Promise<Page<ActorRound>> {
    this.logger.debug('Finding character rounds with query: ', query.rsql);
    const filter = await readableGamesFilter(this.gameRepository, this.gameGuard, query.userId, query.roles);
    return await this.characterRoundRepository.findByRsql(query.rsql, query.page, query.size, filter);
  }
}
