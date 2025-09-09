import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors';
import { Game } from '../../../domain/entities/game.aggregate';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import { AddGameFactionsCommand } from '../commands/add-game-factions.command';

@CommandHandler(AddGameFactionsCommand)
export class AddGameFactionsHandler implements ICommandHandler<AddGameFactionsCommand, Game> {
  private readonly logger = new Logger(AddGameFactionsHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('GameEventBus') private readonly gameEventBus: GameEventBusPort,
  ) {}

  async execute(command: AddGameFactionsCommand): Promise<Game> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new NotFoundError('Game', command.gameId);
    }
    game.addFactions(command.factions);
    const updated = await this.gameRepository.update(command.gameId, game);
    const events = game.pullDomainEvents();
    events.forEach((event) => this.gameEventBus.publish(event));
    return updated;
  }
}
