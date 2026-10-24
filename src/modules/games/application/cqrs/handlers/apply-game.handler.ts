import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { type TacticalOutcomePort, TACTICAL_OUTCOME_PORT } from '../../../../strategic/application/ports/tactical-outcome.port.js';
import { Game } from '../../../domain/aggregates/game.js';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { ApplyGameCommand } from '../commands/apply-game.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

/**
 * Applies the outcome of a finished game to the strategic characters (spec 013, §3), one call per character not
 * applied yet, with the service token. Each one keeps its `appliedAt` or its error, so a retry only sends the pending
 * ones; the strategic API is idempotent by game.
 */
@CommandHandler(ApplyGameCommand)
export class ApplyGameHandler implements ICommandHandler<ApplyGameCommand, Game> {
  private readonly logger = new Logger(ApplyGameHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(TACTICAL_OUTCOME_PORT) private readonly tacticalOutcomeClient: TacticalOutcomePort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(command: ApplyGameCommand): Promise<Game> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) throw new NotFoundError('Game', command.gameId);
    for (const character of game.pendingOutcomeCharacters()) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { appliedAt, error, ...outcome } = character;
        await this.tacticalOutcomeClient.apply(character.characterId, { ...outcome, tacticalGameId: game.id, tacticalGameName: game.name });
        game.markOutcomeApplied(character.actorId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Outcome of ${character.characterId} in game ${game.id} not applied: ${message}`);
        game.markOutcomeApplied(character.actorId, message);
      }
    }
    const updated = await this.gameRepository.update(game.id, game);
    void this.eventPublisher.publish('game', ...game.getUncommittedEvents());
    return updated;
  }
}
