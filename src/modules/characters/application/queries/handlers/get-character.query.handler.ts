import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { NotFoundError } from '../../../../shared/domain/errors';
import { Character } from '../../../domain/entities/character.entity';
import * as characterRepository from '../../ports/out/character.repository';
import { GetCharacterQuery } from '../get-character.query';

@QueryHandler(GetCharacterQuery)
export class GetCharacterQueryHandler implements IQueryHandler<GetCharacterQuery, Character> {
  constructor(@Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository) {}

  async execute(query: GetCharacterQuery): Promise<Character> {
    const data = await this.characterRepository.findById(query.characterId);
    if (!data) {
      throw new NotFoundError('Character', query.characterId);
    }
    return data;
  }
}
