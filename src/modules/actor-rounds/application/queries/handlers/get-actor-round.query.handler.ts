import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { NotFoundError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/entities/actor-round.entity';
import * as crr from '../../ports/out/character-round.repository';
import { GetActorRoundQuery } from '../get-actor-round.query';

@QueryHandler(GetActorRoundQuery)
export class GetActorRoundQueryHandler implements IQueryHandler<GetActorRoundQuery, ActorRound> {
  constructor(@Inject('ActorRoundRepository') private readonly characterRoundRepository: crr.ActorRoundRepository) {}

  async execute(query: GetActorRoundQuery): Promise<ActorRound> {
    const data = await this.characterRoundRepository.findById(query.actorRoundId);
    if (!data) {
      throw new NotFoundError('CharacterRound', query.actorRoundId);
    }
    return data;
  }
}
