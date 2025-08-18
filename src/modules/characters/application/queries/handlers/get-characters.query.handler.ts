import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { Page } from '../../../../shared/domain/entities/page.entity';
import { Character } from '../../../domain/entities/character.entity';
import * as characterRepository from '../../ports/out/character.repository';
import { GetCharactersQuery } from '../get-characters.query';

@QueryHandler(GetCharactersQuery)
export class GetCharactersQueryHandler implements IQueryHandler<GetCharactersQuery, Page<Character>> {
  private readonly logger = new Logger(GetCharactersQueryHandler.name);

  constructor(@Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository) {}

  async execute(query: GetCharactersQuery): Promise<Page<Character>> {
    this.logger.debug('Finding characters with query: ', query.rsql);
    return await this.characterRepository.findByRsql(query.rsql, query.page, query.size);
  }
}
