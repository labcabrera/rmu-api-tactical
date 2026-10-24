import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { AdjustHpCommand } from '../commands/adjust-hp.command.js';

/** Game master hits adjustment: capped at the maximum, waking an actor brought over 0 hits (spec 013, §9.7). */
@CommandHandler(AdjustHpCommand)
export class AdjustHpHandler implements ICommandHandler<AdjustHpCommand, ActorRound> {
  private readonly logger = new Logger(AdjustHpHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: AdjustHpCommand): Promise<ActorRound> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) throw new NotFoundError('Actor round', command.actorRoundId);
    const game = await this.gameRepository.findById(actorRound.gameId);
    game?.checkNotFinished();
    // The phase of the hits log (spec 013, §1.1), when the actor round is the one of the current round.
    const phase = game && game.round === actorRound.round ? game.getEffectPhase() : undefined;
    actorRound.adjustHp(command.dmg || 0, phase);
    return this.actorRoundRepository.update(actorRound.id, actorRound);
  }
}
