import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { Game } from '../../../domain/aggregates/game.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { DeleteGameFactionsCommand } from '../commands/delete-game-factions.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(DeleteGameFactionsCommand)
export class DeleteGameFactionsHandler implements ICommandHandler<DeleteGameFactionsCommand, Game> {
  private readonly logger = new Logger(DeleteGameFactionsHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(command: DeleteGameFactionsCommand): Promise<Game> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new NotFoundError('Game', command.gameId);
    }
    game.deleteFactions(command.factions);
    const updated = await this.gameRepository.update(game);
    const events = game.getUncommittedEvents();
    void this.eventPublisher.publish('game', ...events);
    // The events are handed over: clear them, so a later write of the same aggregate does not publish them again.
    game.commit();
    return updated;
  }
}
