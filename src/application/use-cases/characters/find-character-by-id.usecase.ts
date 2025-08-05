import { inject, injectable } from 'inversify';

import { Character } from '@domain/entities/character.entity';
import { Logger } from '@application/ports/logger';
import { CharacterRepository } from '@application/ports/outbound/character.repository';
import { NotFoundError } from '../../../domain/errors/errors';
import { TYPES } from '../../../shared/types';

@injectable()
export class FindTCharacterByIdUseCase {
  constructor(
    @inject(TYPES.CharacterRepository)
    private readonly characterRepository: CharacterRepository,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async execute(id: string): Promise<Character> {
    const character = await this.characterRepository.findById(id);
    if (!character) {
      throw new NotFoundError('Character', id);
    }
    return character;
  }
}
