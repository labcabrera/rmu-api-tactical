import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { Game } from '../../../domain/aggregates/game.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { DeleteGameActorsCommand } from '../commands/delete-game-actors.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(DeleteGameActorsCommand)
export class DeleteGameActorsHandler implements ICommandHandler<DeleteGameActorsCommand, Game> {
  private readonly logger = new Logger(DeleteGameActorsHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(command: DeleteGameActorsCommand): Promise<Game> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new NotFoundError('Game', command.gameId);
    }
    game.deleteActors(command.actors);
    if (game.status !== 'created') {
      throw new ValidationError('Only games in created status can be modified');
    }
    const updated = await this.gameRepository.update(game);
    const events = game.getUncommittedEvents();
    void this.eventPublisher.publish('game', ...events);
    return updated;
  }
}
