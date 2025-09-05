import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NotFoundError, NotModifiedError, ValidationError } from '../../../../shared/domain/errors';
import { Game } from '../../../domain/entities/game.entity';
import * as gep from '../../ports/out/game-event-producer';
import * as gr from '../../ports/out/game.repository';
import { DeleteGameActorsCommand } from '../delete-game-actors.command';

@CommandHandler(DeleteGameActorsCommand)
export class DeleteGameActorsCommandHandler implements ICommandHandler<DeleteGameActorsCommand, Game> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gr.GameRepository,
    @Inject('GameEventProducer') private readonly gameEventProducer: gep.GameEventProducer,
  ) {}

  async execute(command: DeleteGameActorsCommand): Promise<Game> {
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new NotFoundError('Game', command.gameId);
    }
    if (game.status !== 'created') {
      throw new ValidationError('Only games in created status can be modified');
    }
    let modified = false;
    command.actors.forEach((actorId) => {
      if (game.actors.some((e) => e.id === actorId)) {
        game.actors = game.actors.filter((e) => e.id !== actorId);
        modified = true;
      }
    });
    if (!modified) {
      throw new NotModifiedError('No actors to delete');
    }
    const updated = await this.gameRepository.update(command.gameId, game);
    await this.gameEventProducer.updated(updated);
    return updated;
  }
}
