import { inject, injectable } from 'inversify';

import { CharacterRound } from '@domain/entities/character-round.entity';
import { Page } from '@domain/entities/page.entity';

import { Logger } from '@application/ports/logger';
import { CharacterRoundRepository } from '@application/ports/outbound/character-round.repository';
import { TYPES } from '@shared/types';

@injectable()
export class FindCharacterRoundsUseCase {
  constructor(
    @inject(TYPES.CharacterRoundRepository)
    private readonly characterRoundRepository: CharacterRoundRepository,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async execute(rsql: string, page: number, size: number): Promise<Page<CharacterRound>> {
    this.logger.info(`FindTacticalCharacterRoundsUseCase: Finding tactical character rounds`);
    return await this.characterRoundRepository.findByRsql(rsql, page, size);
  }
}
