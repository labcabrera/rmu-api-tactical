import { inject, injectable } from 'inversify';

import { Character } from '@domain/entities/character.entity';
import { Page } from '@domain/entities/page.entity';
import { Logger } from '@domain/ports/logger';
import { CharacterRepository } from '@domain/ports/outbound/character.repository';
import { CharacterQuery } from '@domain/queries/character.query';

import { TYPES } from '@shared/types';

@injectable()
export class FindCharactersUseCase {
  constructor(
    @inject(TYPES.CharacterRepository)
    private readonly characterRepository: CharacterRepository,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async execute(criteria: CharacterQuery): Promise<Page<Character>> {
    this.logger.info(
      `FindTacticalCharactersUseCase: Finding tactical characters with criteria: ${JSON.stringify(criteria)}`
    );
    return await this.characterRepository.find(criteria);
  }
}
