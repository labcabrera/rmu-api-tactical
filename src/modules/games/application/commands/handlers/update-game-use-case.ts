import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';

import { Game } from '../../../domain/entities/game.entity';
import * as gameRepository from '../../ports/out/game.repository';
import { UpdateGameCommand } from '../update-game.command';

@CommandHandler(UpdateGameCommand)
export class UpdateGameUseCase {
  constructor(@Inject('GameRepository') private readonly gameRepository: gameRepository.GameRepository) {}

  async execute(command: UpdateGameCommand): Promise<Game> {
    return await this.gameRepository.update(command.gameId, command);
  }
}
