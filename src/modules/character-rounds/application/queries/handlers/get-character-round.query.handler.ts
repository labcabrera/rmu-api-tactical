import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { NotFoundError } from '../../../../shared/domain/errors';
import { CharacterRound } from '../../../domain/entities/character-round.entity';
import * as crr from '../../ports/out/character-round.repository';
import { GetCharacterRoundQuery } from '../get-character-round.query';

@QueryHandler(GetCharacterRoundQuery)
export class GetCharacterRoundQueryHandler implements IQueryHandler<GetCharacterRoundQuery, CharacterRound> {
  constructor(@Inject('CharacterRoundRepository') private readonly characterRoundRepository: crr.CharacterRoundRepository) {}

  async execute(query: GetCharacterRoundQuery): Promise<CharacterRound> {
    const data = await this.characterRoundRepository.findById(query.characterRoundId);
    if (!data) {
      throw new NotFoundError('CharacterRound', query.characterRoundId);
    }
    return data;
  }
}
