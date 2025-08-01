import { CharacterRoundRepository } from "@/domain/ports/character-round.repository";
import { CharacterRound } from "@domain/entities/character-round.entity";
import { Logger } from "@domain/ports/logger";

import { UpdateInitiativeCommand } from "../../commands/update-initiative.command";

export class UpdateCharacterInitiativeUseCase {
  constructor(
    private readonly characterRoundRepository: CharacterRoundRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: UpdateInitiativeCommand): Promise<CharacterRound> {
    this.logger.info(
      `Updating initiative for character round: ${command.characterRoundId} with roll: ${command.initiativeRoll}`,
    );
    const characterRound = await this.characterRoundRepository.findById(
      command.characterRoundId,
    );
    const baseInitiative = characterRound.initiative?.base || 0;
    const penalty = characterRound.initiative?.penalty || 0;
    const total = baseInitiative + penalty + command.initiativeRoll;
    const updatedCharacterRound = await this.characterRoundRepository.update(
      command.characterRoundId,
      {
        initiative: {
          base: baseInitiative,
          penalty: penalty,
          roll: command.initiativeRoll,
          total: total,
        },
      },
    );
    return this.mapToCharacterRoundInitiative(updatedCharacterRound);
  }

  private mapToCharacterRoundInitiative(characterRound: any): CharacterRound {
    return {
      id: characterRound.id,
      gameId: characterRound.gameId,
      characterId: characterRound.characterId,
      round: characterRound.round,
      initiative: {
        base: characterRound.initiative?.base || 0,
        penalty: characterRound.initiative?.penalty || 0,
        roll: characterRound.initiative?.roll || 0,
        total: characterRound.initiative?.total || 0,
      },
      actionPoints: characterRound.actionPoints || 0,
      createdAt: characterRound.createdAt,
      updatedAt: characterRound.updatedAt,
    };
  }
}
