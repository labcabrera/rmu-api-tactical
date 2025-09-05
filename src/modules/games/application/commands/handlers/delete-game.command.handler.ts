import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NotFoundError } from '../../../../shared/domain/errors';
import * as gameEventProducer from '../../ports/out/game-event-producer';
import * as gr from '../../ports/out/game.repository';
import { DeleteGameCommand } from '../delete-game.command';

@CommandHandler(DeleteGameCommand)
export class DeleteGameCommandHandler implements ICommandHandler<DeleteGameCommand> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gr.GameRepository,
    @Inject('GameEventProducer') private readonly gameEventProducer: gameEventProducer.GameEventProducer,
  ) {}

  async execute(command: DeleteGameCommand): Promise<void> {
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new NotFoundError('Game', command.gameId);
    }
    //TODO delete actions and character rounds
    await this.gameRepository.deleteById(command.gameId);
    await this.gameEventProducer.deleted(game);
  }
}
