import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { Game } from '../../../domain/entities/game.entity';
import * as gameEventProducer from '../../ports/out/game-event-producer';
import * as gameRepository from '../../ports/out/game.repository';
import { CreateGameCommand } from '../create-game.command';

@CommandHandler(CreateGameCommand)
export class CreateGameUseCase implements ICommandHandler<CreateGameCommand, Game> {
  private readonly logger = new Logger(CreateGameUseCase.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: gameRepository.GameRepository,
    @Inject('GameEventProducer') private readonly gameEventProducer: gameEventProducer.GameEventProducer,
  ) {}

  async execute(command: CreateGameCommand): Promise<Game> {
    this.logger.debug(`Creating game: ${command.name} for user ${command.userId}`);
    const factions = command.factions || this.defaultFactions();
    const newGame: Partial<Game> = {
      name: command.name,
      description: command.description,
      status: 'created',
      phase: 'not_started',
      factions: factions,
      round: 0,
      owner: command.userId,
      createdAt: new Date(),
    };
    const savedGame = await this.gameRepository.save(newGame);
    await this.gameEventProducer.created(savedGame);
    return savedGame;
  }

  private defaultFactions(): string[] {
    return ['Light', 'Evil', 'Neutral'];
  }
}
