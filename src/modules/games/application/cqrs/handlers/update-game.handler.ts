import { Inject, Logger } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { Game } from '../../../domain/aggregates/game.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { UpdateGameCommand } from '../commands/update-game.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(UpdateGameCommand)
export class UpdateGameHandler {
  private readonly logger = new Logger(UpdateGameHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(command: UpdateGameCommand): Promise<Game> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new NotFoundError('Game', command.gameId);
    }
    game.update(command.name, command.description, command.environment, command.imageUrl);
    const updated = await this.gameRepository.update(command.gameId, command);
    const events = game.getUncommittedEvents();
    void this.eventPublisher.publish('game', ...events);
    return updated;
  }
}
