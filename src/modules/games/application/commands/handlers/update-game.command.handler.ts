import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';

import { Game } from '../../../domain/entities/game.entity';
import * as gameEventProducer_1 from '../../ports/out/game-event-producer';
import * as gameRepository from '../../ports/out/game.repository';
import { UpdateGameCommand } from '../update-game.command';

@CommandHandler(UpdateGameCommand)
export class UpdateGameCommandHandler {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gameRepository.GameRepository,
    @Inject('GameEventProducer') private readonly gameEventProducer: gameEventProducer_1.GameEventProducer,
  ) {}

  async execute(command: UpdateGameCommand): Promise<Game> {
    const updated = await this.gameRepository.update(command.gameId, command);
    await this.gameEventProducer.updated(updated);
    return updated;
  }
}
