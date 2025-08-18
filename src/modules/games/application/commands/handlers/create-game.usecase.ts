import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { Game } from '../../../domain/entities/game.entity';
import * as gameEventProducer from '../../ports/out/game-event-producer';
import * as gameRepository from '../../ports/out/game.repository';
import { CreateGameCommand } from '../create-game.command';

@CommandHandler(CreateGameCommand)
export class CreateGameUseCase implements ICommandHandler<CreateGameCommand, Game> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gameRepository.GameRepository,
    @Inject() private readonly eventNotificationPort: gameEventProducer.GameEventProducer,
  ) {}

  async execute(command: CreateGameCommand): Promise<Game> {
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
    await this.eventNotificationPort.created(savedGame);
    return savedGame;
  }

  private defaultFactions(): string[] {
    return ['Light', 'Evil', 'Neutral'];
  }
}
