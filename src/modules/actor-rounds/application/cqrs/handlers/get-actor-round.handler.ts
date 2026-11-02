import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { GetActorRoundQuery } from '../queries/get-actor-round.query.js';

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
