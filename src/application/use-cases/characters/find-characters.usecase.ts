import { Character } from "../../../domain/entities/character.entity";
import { Page } from "../../../domain/entities/page.entity";
import { CharacterRepository } from "../../../domain/ports/character.repository";
import { Logger } from "../../../domain/ports/logger";
import { CharacterQuery } from "../../../domain/queries/character.query";

export class FindCharactersUseCase {
  constructor(
    private readonly characterRepository: CharacterRepository,
    private readonly logger: Logger,
  ) {}

  async execute(criteria: CharacterQuery): Promise<Page<Character>> {
    this.logger.info(
      `FindTacticalCharactersUseCase: Finding tactical characters with criteria: ${JSON.stringify(criteria)}`,
    );
    return await this.characterRepository.find(criteria);
  }
}
