import { inject, injectable } from 'inversify';

import { Character } from "@domain/entities/character.entity";
import { Logger } from "@domain/ports/logger";
import { CharacterRepository } from "@domain/ports/outbound/character.repository";
import { TYPES } from '../../../shared/types';

@injectable()
export class FindTCharacterByIdUseCase {
  constructor(
    @inject(TYPES.CharacterRepository) private readonly characterRepository: CharacterRepository,
    @inject(TYPES.Logger) private readonly logger: Logger,
  ) {}

  async execute(id: string): Promise<Character> {
    return await this.characterRepository.findById(id);
  }
}
