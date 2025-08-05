import { inject, injectable } from 'inversify';

import { Logger } from '@domain/ports/logger';
import { CharacterRepository } from '@domain/ports/outbound/character.repository';

import { TYPES } from '@shared/types';
import { NotFoundError } from '../../../domain/errors/errors';

@injectable()
export class DeleteCharacterUseCase {
  constructor(
    @inject(TYPES.CharacterRepository) private readonly characterRepository: CharacterRepository,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async execute(characterId: string): Promise<void> {
    this.logger.info(`Executing character deletion use case<< ${characterId}`);
    const character = await this.characterRepository.findById(characterId);
    if (!character) {
      throw new NotFoundError('Character', characterId);
    }
    await this.characterRepository.deleteById(characterId);
  }
}
