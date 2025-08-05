import { Action } from "@domain/entities/action.entity";
import { Logger } from "@domain/ports/logger";
import { ActionRepository } from "@domain/ports/outbound/action.repository";
import { CharacterRoundRepository } from "@domain/ports/outbound/character-round.repository";
import { CharacterRepository } from "@domain/ports/outbound/character.repository";
import { GameRepository } from "@domain/ports/outbound/game.repository";

import { CreateActionCommand } from "@application/commands/create-action.command";

export class CreateActionUseCase {
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly characterRepository: CharacterRepository,
    private readonly characterRoundRepository: CharacterRoundRepository,
    private readonly actionRepository: ActionRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: CreateActionCommand): Promise<Action> {
    this.logger.info(
      `CreateActionUseCase: Creating action ${command.actionType} for character ${command.characterId}`,
    );

    //TODO VALIDATION

    const action: Omit<Action, "id"> = {
      gameId: command.gameId,
      round: command.round,
      characterId: command.characterId,
      actionType: command.actionType,
      phaseStart: command.phaseStart,
      actionPoints: command.actionPoints,
      createdAt: new Date(),
    };
    return this.actionRepository.create(action);
  }
}
