import { Character } from "../../../domain/entities/character.entity";
import { Logger } from "../../../domain/ports/logger";
import { CharacterRepository } from "../../../domain/ports/outbound/character.repository";

export class FindTCharacterByIdUseCase {
  constructor(
    private readonly characterRepository: CharacterRepository,
    private readonly logger: Logger,
  ) {}

  async execute(id: string): Promise<Character> {
    return await this.characterRepository.findById(id);
  }
}
