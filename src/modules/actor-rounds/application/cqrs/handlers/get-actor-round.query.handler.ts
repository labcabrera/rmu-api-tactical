import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/entities/actor-round.aggregate';
import type { ActorRoundRepository } from '../../ports/out/character-round.repository';
import { GetActorRoundQuery } from '../queries/get-actor-round.query';

@QueryHandler(GetActorRoundQuery)
export class GetActorRoundHandler implements IQueryHandler<GetActorRoundQuery, ActorRound> {
  constructor(@Inject('ActorRoundRepository') private readonly characterRoundRepository: ActorRoundRepository) {}

  async execute(query: GetActorRoundQuery): Promise<ActorRound> {
    const data = await this.characterRoundRepository.findById(query.actorRoundId);
    if (!data) {
      throw new NotFoundError('CharacterRound', query.actorRoundId);
    }
    return data;
  }
}
