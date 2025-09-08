import { Inject, Logger } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { Game } from '../../../domain/entities/game.aggregate';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import { UpdateGameCommand } from '../commands/update-game.command';

@CommandHandler(UpdateGameCommand)
export class UpdateGameHandler {
  private readonly logger = new Logger(UpdateGameHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('GameEventProducer') private readonly gameEventProducer: GameEventBusPort,
  ) {}

  async execute(command: UpdateGameCommand): Promise<Game> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    const updated = await this.gameRepository.update(command.gameId, command);
    await this.gameEventProducer.updated(updated);
    return updated;
  }
}
