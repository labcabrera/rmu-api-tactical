import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError, NotModifiedError, ValidationError } from '../../../../shared/domain/errors';
import { Game } from '../../../domain/entities/game.aggregate';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import { DeleteGameFactionsCommand } from '../commands/delete-game-factions.command';

@CommandHandler(DeleteGameFactionsCommand)
export class DeleteGameFactionsHandler implements ICommandHandler<DeleteGameFactionsCommand, Game> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('GameEventProducer') private readonly gameEventBus: GameEventBusPort,
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
    await this.gameEventBus.updated(updated);
    return updated;
  }
}
