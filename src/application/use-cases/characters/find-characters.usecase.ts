import { inject, injectable } from 'inversify';

import { Character } from '@domain/entities/character.entity';
import { Page } from '@domain/entities/page.entity';
import { Logger } from '@application/ports/logger';
import { CharacterRepository } from '@application/ports/outbound/character.repository';

import { TYPES } from '@shared/types';

@injectable()
export class FindCharactersUseCase {
  constructor(
    @inject(TYPES.CharacterRepository) private readonly characterRepository: CharacterRepository,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async execute(rsql: string, page: number, size: number): Promise<Page<Character>> {
    return await this.characterRepository.findByRsql(rsql, page, size);
  }
}
