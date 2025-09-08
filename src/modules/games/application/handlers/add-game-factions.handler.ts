import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError, NotModifiedError } from '../../../shared/domain/errors';
import { Game } from '../../domain/entities/game.aggregate';
import { AddGameFactionsCommand } from '../cqrs/commands/add-game-factions.command';
import * as gep from '../ports/game-event-bus.port';
import * as gr from '../ports/game.repository';

@CommandHandler(AddGameFactionsCommand)
export class AddGameFactionsCommandHandler implements ICommandHandler<AddGameFactionsCommand, Game> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gr.GameRepository,
    @Inject('GameEventProducer') private readonly gameEventProducer: gep.GameEventBusPort,
  ) {}

  async execute(command: AddGameFactionsCommand): Promise<Game> {
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new NotFoundError('Game', command.gameId);
    }
    let modified = false;
    command.factions.forEach((faction) => {
      if (!game.factions.includes(faction)) {
        game.factions.push(faction);
        modified = true;
      }
    });
    if (!modified) {
      throw new NotModifiedError('No new factions to add');
    }
    const updated = await this.gameRepository.update(command.gameId, game);
    await this.gameEventProducer.updated(updated);
    return updated;
  }
}
