import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/actor-round.repository';
import { NotFoundError } from '../../../../shared/domain/errors';
import { Game } from '../../../domain/aggregates/game.aggregate';
import { TacticalGameOutcomeCalculator } from '../../../domain/services/tactical-game-outcome.calculator';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import { FinishGameCommand } from '../commands/finish-game.command';

/** Finishes a game in progress with its outcome; the characters at risk need a fate (spec 013, §3). */
@CommandHandler(FinishGameCommand)
export class FinishGameHandler implements ICommandHandler<FinishGameCommand, Game> {
  private readonly logger = new Logger(FinishGameHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('GameEventBus') private readonly gameEventBus: GameEventBusPort,
  ) {}

  async execute(command: FinishGameCommand): Promise<Game> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) throw new NotFoundError('Game', command.gameId);
    game.checkNotFinished();
    const actorRounds = await this.actorRoundRepository.findByGameId(game.id);
    game.finish(TacticalGameOutcomeCalculator.finish(game, actorRounds, command.fates || []));
    const updated = await this.gameRepository.update(game.id, game);
    game.getUncommittedEvents().forEach(event => this.gameEventBus.publish(event));
    return updated;
  }
}
