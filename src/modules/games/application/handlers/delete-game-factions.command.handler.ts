import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NotFoundError, NotModifiedError, ValidationError } from '../../../shared/domain/errors';
import { Game } from '../../domain/entities/game.entity';
import { DeleteGameFactionsCommand } from '../commands/delete-game-factions.command';
import * as gep from '../ports/out/game-event-bus.port';
import * as gr from '../ports/out/game.repository';

@CommandHandler(DeleteGameFactionsCommand)
export class DeleteGameFactionsCommandHandler implements ICommandHandler<DeleteGameFactionsCommand, Game> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gr.GameRepository,
    @Inject('GameEventProducer') private readonly gameEventProducer: gep.GameEventBusPort,
  ) {}

  async execute(command: DeleteGameFactionsCommand): Promise<Game> {
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new NotFoundError('Game', command.gameId);
    }
    if (game.status !== 'created') {
      throw new ValidationError('Only games in created status can be modified');
    }
    let modified = false;
    command.factions.forEach((factionId) => {
      if (game.factions.includes(factionId)) {
        game.factions = game.factions.filter((id) => id !== factionId);
        //TODO remove actors
        modified = true;
      }
    });
    if (!modified) {
      throw new NotModifiedError('No factions to delete');
    }
    const updated = await this.gameRepository.update(command.gameId, game);
    await this.gameEventProducer.updated(updated);
    return updated;
  }
}
