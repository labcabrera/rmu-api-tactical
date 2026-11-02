import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { RemoveDeletedFactionCommand } from '../commands/remove-deleted-faction.command.js';

/**
 * Takes a faction deleted in strategic out of the games in `created` status, with its actors: its characters and its
 * NPC specimens (spec 055). The games already played keep it, as they keep the characters of the faction. The
 * environment does not depend on strategic.
 */
@CommandHandler(RemoveDeletedFactionCommand)
export class RemoveDeletedFactionHandler implements ICommandHandler<RemoveDeletedFactionCommand> {
  private readonly logger = new Logger(RemoveDeletedFactionHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(command: RemoveDeletedFactionCommand): Promise<void> {
    const games = await this.gameRepository.findCreatedByFaction(command.factionId);
    for (const game of games) {
      game.deleteFactions([command.factionId]);
      await this.gameRepository.update(game);
      void this.eventPublisher.publish('game', ...game.getUncommittedEvents());
      game.commit();
      this.logger.log(`Faction ${command.factionId} removed from game ${game.id}`);
    }
  }
}
