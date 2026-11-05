import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InterruptHeldActionsCommand } from '../../../../actions/application/cqrs/commands/interrupt-held-actions.command.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { ResolveAlertCommand } from '../commands/resolve-alert.command.js';

@CommandHandler(ResolveAlertCommand)
export class ResolveAlertHandler implements ICommandHandler<ResolveAlertCommand, ActorRound> {
  private readonly logger = new Logger(ResolveAlertHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: ResolveAlertCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);

    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) throw new NotFoundError('Actor round', command.actorRoundId);
    (await this.gameRepository.findById(actorRound.gameId))?.checkNotFinished();

    const held = actorRound.resolveAlert(command.alertId, command.outcome, command.side);
    const updated = await this.actorRoundRepository.update(actorRound);
    // Workspace spec 077, decision A2.4: a failed Mental Focus maneuver interrupts the held actions.
    if (held.length > 0) {
      await this.commandBus.execute(new InterruptHeldActionsCommand(updated.id, held, command.userId, command.roles));
    }
    //TODO notify event bus
    return updated;
  }
}
