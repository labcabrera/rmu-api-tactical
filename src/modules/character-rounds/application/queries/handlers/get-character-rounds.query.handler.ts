import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { Page } from '../../../../shared/domain/entities/page.entity';
import { CharacterRound } from '../../../domain/entities/character-round.entity';
import * as crr from '../../ports/out/character-round.repository';
import { GetCharacterRoundsQuery } from '../get-character-rounds.query';

@QueryHandler(GetCharacterRoundsQuery)
export class GetCharacterRoundsQueryHandler implements IQueryHandler<GetCharacterRoundsQuery, Page<CharacterRound>> {
  private readonly logger = new Logger(GetCharacterRoundsQueryHandler.name);

  constructor(@Inject('CharacterRoundRepository') private readonly characterRoundRepository: crr.CharacterRoundRepository) {}

  async execute(query: GetCharacterRoundsQuery): Promise<Page<CharacterRound>> {
    this.logger.debug('Finding character rounds with query: ', query.rsql);
    return await this.characterRoundRepository.findByRsql(query.rsql, query.page, query.size);
  }
}
