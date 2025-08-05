import { inject, injectable } from 'inversify';

import { Logger } from '@domain/ports/logger';
import { CharacterRepository } from '@domain/ports/outbound/character.repository';

import { TYPES } from '@shared/types';

@injectable()
export class DeleteCharacterUseCase {
  constructor(
    @inject(TYPES.CharacterRepository)
    private readonly characterRepository: CharacterRepository,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async execute(characterId: string): Promise<void> {
    this.logger.info(`DeleteTacticalCharacterUseCase: Deleting tactical character: ${characterId}`);
    await this.characterRepository.delete(characterId);
  }
}
