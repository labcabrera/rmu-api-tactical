import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { Game } from '../../domain/entities/game.aggregate';
import { UpdateGameCommand } from '../cqrs/commands/update-game.command';
import * as gameEventProducer_1 from '../ports/game-event-bus.port';
import * as gameRepository from '../ports/game.repository';

@CommandHandler(UpdateGameCommand)
export class UpdateGameCommandHandler {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gameRepository.GameRepository,
    @Inject('GameEventProducer') private readonly gameEventProducer: gameEventProducer_1.GameEventBusPort,
  ) {}

  async execute(command: UpdateGameCommand): Promise<Game> {
    const updated = await this.gameRepository.update(command.gameId, command);
    await this.gameEventProducer.updated(updated);
    return updated;
  }
}
