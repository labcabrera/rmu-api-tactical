import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { ResolveBreakageCheckCommand } from '../commands/resolve-breakage-check.command.js';

/**
 * Breakage check (§6.1, spec 019): the roll of an item of the actor resolved on Table 6-1. The damage goes to the
 * item, with this game as its source, and from the next action on to its attacks, the shield and the armor.
 */
@CommandHandler(ResolveBreakageCheckCommand)
export class ResolveBreakageCheckHandler implements ICommandHandler<ResolveBreakageCheckCommand, ActorRound> {
  private readonly logger = new Logger(ResolveBreakageCheckHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
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
