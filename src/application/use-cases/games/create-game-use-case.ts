import { Game } from "../../../domain/entities/game.entity";
import { GameRepository } from "../../../domain/ports/game.repository";
import { Logger } from "../../../domain/ports/logger";
import { CreateGameCommand } from "../../commands/create-game.command";

export class CreateGameUseCase {
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly logger: Logger,
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
