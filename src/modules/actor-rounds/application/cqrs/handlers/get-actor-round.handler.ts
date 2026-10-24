import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port';
import { GetActorRoundQuery } from '../queries/get-actor-round.query';

@QueryHandler(GetActorRoundQuery)
export class GetActorRoundHandler implements IQueryHandler<GetActorRoundQuery, ActorRound> {
  constructor(@Inject(ACTOR_ROUND_REPOSITORY) private readonly characterRoundRepository: ActorRoundRepository) {}

  async execute(query: GetActorRoundQuery): Promise<ActorRound> {
    const data = await this.characterRoundRepository.findById(query.actorRoundId);
    if (!data) {
      throw new NotFoundError('CharacterRound', query.actorRoundId);
    }
    return data;
  }
}
