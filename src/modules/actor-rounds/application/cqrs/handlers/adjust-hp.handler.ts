import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import type { ActorRoundRepository } from '../../ports/actor-round.repository';
import { AdjustHpCommand } from '../commands/adjust-hp.command';

/** Game master hits adjustment: capped at the maximum, waking an actor brought over 0 hits (spec 013, §9.7). */
@CommandHandler(AdjustHpCommand)
export class AdjustHpHandler implements ICommandHandler<AdjustHpCommand, ActorRound> {
  private readonly logger = new Logger(AdjustHpHandler.name);

  constructor(
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
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
