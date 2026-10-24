import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import type { ActorRoundRepository } from '../../ports/actor-round.repository';
import { ResolveBreakageCheckCommand } from '../commands/resolve-breakage-check.command';

/**
 * Breakage check (§6.1, spec 019): the roll of an item of the actor resolved on Table 6-1. The damage goes to the
 * item, with this game as its source, and from the next action on to its attacks, the shield and the armor.
 */
@CommandHandler(ResolveBreakageCheckCommand)
export class ResolveBreakageCheckHandler implements ICommandHandler<ResolveBreakageCheckCommand, ActorRound> {
  private readonly logger = new Logger(ResolveBreakageCheckHandler.name);

  constructor(
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: ResolveBreakageCheckCommand): Promise<ActorRound> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) throw new NotFoundError('ActorRound', command.actorRoundId);
    const game = await this.gameRepository.findById(actorRound.gameId);
    game?.checkNotFinished();

    const result = actorRound.resolveBreakageCheck({
      itemId: command.itemId,
      roll: command.roll,
      unmodifiedRoll: command.unmodifiedRoll,
      alertId: command.alertId,
      strength: command.strength,
      modifiers: command.modifiers,
      tacticalGameName: game?.name,
    });
    this.logger.debug(`Breakage check result: ${JSON.stringify(result)}`);
    const updated = await this.actorRoundRepository.update(actorRound.id, actorRound);
    updated.lastBreakageCheck = result;
    return updated;
  }
}
