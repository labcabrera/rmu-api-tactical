import { Character } from "../../../domain/entities/character.entity";
import { CharacterRepository } from "../../../domain/ports/character.repository";
import { Logger } from "../../../domain/ports/logger";

export class FindTCharacterByIdUseCase {
  constructor(
    private readonly characterRepository: CharacterRepository,
    private readonly logger: Logger,
  ) {}

  async execute(id: string): Promise<Character> {
    return await this.characterRepository.findById(id);
  }
}
