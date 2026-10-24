import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../../../actor-rounds/application/ports/actor-round-repository.port';
import { NotFoundError } from '../../../../shared/domain/errors/errors';
import { Game } from '../../../domain/aggregates/game';
import { TacticalGameOutcomeCalculator } from '../../../domain/services/tactical-game-outcome.calculator';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port';
import { FinishGameCommand } from '../commands/finish-game.command';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port';

/** Finishes a game in progress with its outcome; the characters at risk need a fate (spec 013, §3). */
@CommandHandler(FinishGameCommand)
export class FinishGameHandler implements ICommandHandler<FinishGameCommand, Game> {
  private readonly logger = new Logger(FinishGameHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(command: FinishGameCommand): Promise<Game> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) throw new NotFoundError('Game', command.gameId);
    game.checkNotFinished();
    const actorRounds = await this.actorRoundRepository.findByGameId(game.id);
    game.finish(TacticalGameOutcomeCalculator.finish(game, actorRounds, command.fates || []));
    const updated = await this.gameRepository.update(game.id, game);
    void this.eventPublisher.publish('game', ...game.getUncommittedEvents());
    return updated;
  }
}
