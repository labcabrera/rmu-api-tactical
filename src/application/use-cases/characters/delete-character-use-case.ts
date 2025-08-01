import { CharacterRepository } from "../../../domain/ports/character.repository";
import { Logger } from "../../../domain/ports/logger";

export class DeleteCharacterUseCase {
  constructor(
    private readonly characterRepository: CharacterRepository,
    private readonly logger: Logger,
  ) {}

  async execute(characterId: string): Promise<void> {
    this.logger.info(
      `DeleteTacticalCharacterUseCase: Deleting tactical character: ${characterId}`,
    );
    await this.characterRepository.delete(characterId);
  }
}
