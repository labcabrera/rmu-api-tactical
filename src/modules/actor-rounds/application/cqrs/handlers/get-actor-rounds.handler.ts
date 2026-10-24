import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Page } from '../../../../shared/application/pagination/page';
import { ActorRound } from '../../../domain/aggregates/actor-round';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port';
import { GetActorsRoundsQuery as GetActorRoundsQuery } from '../queries/get-actor-rounds.query';

@QueryHandler(GetActorRoundsQuery)
export class GetActorRoundsHandler implements IQueryHandler<GetActorRoundsQuery, Page<ActorRound>> {
  private readonly logger = new Logger(GetActorRoundsHandler.name);

  constructor(@Inject(ACTOR_ROUND_REPOSITORY) private readonly characterRoundRepository: ActorRoundRepository) {}

  async execute(query: GetActorRoundsQuery): Promise<Page<ActorRound>> {
    this.logger.debug('Finding character rounds with query: ', query.rsql);
    return await this.characterRoundRepository.findByRsql(query.rsql, query.page, query.size);
  }
}
