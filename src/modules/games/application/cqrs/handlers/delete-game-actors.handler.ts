import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError, NotModifiedError, ValidationError } from '../../../../shared/domain/errors';
import { Game } from '../../../domain/entities/game.aggregate';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import { DeleteGameActorsCommand } from '../commands/delete-game-actors.command';

@CommandHandler(DeleteGameActorsCommand)
export class DeleteGameActorsHandler implements ICommandHandler<DeleteGameActorsCommand, Game> {
  private readonly logger = new Logger(DeleteGameActorsHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('GameEventProducer') private readonly gameEventBus: GameEventBusPort,
  ) {}

  async execute(command: DeleteGameActorsCommand): Promise<Game> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
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
    await this.gameEventBus.updated(updated);
    return updated;
  }
}
