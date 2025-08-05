import { inject, injectable } from 'inversify';

import { Game } from "../../../domain/entities/game.entity";
import { Logger } from "../../../domain/ports/logger";
import { GameRepository } from "../../../domain/ports/outbound/game.repository";
import { TYPES } from '../../../shared/types';
import { CreateGameCommand } from "../../commands/create-game.command";

@injectable()
export class CreateGameUseCase {
  constructor(
    @inject(TYPES.GameRepository) private readonly gameRepository: GameRepository,
    @inject(TYPES.Logger) private readonly logger: Logger,
  ) {}

  async execute(command: CreateGameCommand): Promise<Game> {
    this.logger.info(
      `Creating tactical game: ${command.name} for user: ${command.user}`,
    );

    // Aplicar reglas de negocio
    let factions = command.factions || [];
    if (!factions || factions.length === 0) {
      factions = ["Light", "Evil", "Neutral"];
    }

    const newGame: Game = {
      user: command.user,
      name: command.name,
      description: command.description,
      status: "created",
      factions,
      round: 0,
      createdAt: new Date(),
    };

    const savedGame = await this.gameRepository.save(newGame);

    this.logger.info(`Created tactical game with ID: ${savedGame.id}`);
    return savedGame;
  }
}
