import { inject, injectable } from 'inversify';

import { CharacterRound } from "@domain/entities/character-round.entity";
import { Page } from "@domain/entities/page.entity";
import { Logger } from "@domain/ports/logger";
import { CharacterRoundRepository } from "@domain/ports/outbound/character-round.repository";
import { CharacterRoundQuery } from "@domain/queries/character-round.query";
import { TYPES } from '../../../shared/types';

@injectable()
export class FindCharacterRoundsUseCase {
  constructor(
    @inject(TYPES.CharacterRoundRepository) private readonly characterRoundRepository: CharacterRoundRepository,
    @inject(TYPES.Logger) private readonly logger: Logger,
  ) {}

  async execute(criteria: CharacterRoundQuery): Promise<Page<CharacterRound>> {
    this.logger.info(
      `FindTacticalCharacterRoundsUseCase: Finding tactical character rounds`,
    );
    return await this.characterRoundRepository.find(criteria);
  }
}
