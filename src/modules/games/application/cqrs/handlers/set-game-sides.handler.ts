import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';
import { Game } from '../../../domain/aggregates/game.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { SetGameSidesCommand } from '../commands/set-game-sides.command.js';

/** Workspace spec 100, decisions 4 and 5: every side at once, validated against the factions and actors of the game. */
@CommandHandler(SetGameSidesCommand)
export class SetGameSidesHandler implements ICommandHandler<SetGameSidesCommand, Game> {
  private readonly logger = new Logger(SetGameSidesHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(command: SetGameSidesCommand): Promise<Game> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new NotFoundError('Game', command.gameId);
    }
    game.checkVersion(command.expectedVersion);
    game.setSides(command.sides);
    if (!game.hasChanges()) return game;
    const updated = await this.gameRepository.update(game);
    void this.eventPublisher.publish('game', ...game.getUncommittedEvents());
    // The events are handed over: clear them, so a later write of the same aggregate does not publish them again.
    game.commit();
    return updated;
  }
}
