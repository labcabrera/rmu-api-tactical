import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { Page } from '../../../../shared/domain/entities/page.entity';
import { ActorRound } from '../../../domain/entities/actor-round.aggregate';
import * as crr from '../../ports/out/character-round.repository';
import { GetActorsRoundsQuery as GetActorRoundsQuery } from '../get-actor-rounds.query';

@QueryHandler(GetActorRoundsQuery)
export class GetCharacterRoundsQueryHandler implements IQueryHandler<GetActorRoundsQuery, Page<ActorRound>> {
  private readonly logger = new Logger(GetCharacterRoundsQueryHandler.name);

  constructor(@Inject('ActorRoundRepository') private readonly characterRoundRepository: crr.ActorRoundRepository) {}

  async execute(query: GetActorRoundsQuery): Promise<Page<ActorRound>> {
    this.logger.debug('Finding character rounds with query: ', query.rsql);
    return await this.characterRoundRepository.findByRsql(query.rsql, query.page, query.size);
  }
}
