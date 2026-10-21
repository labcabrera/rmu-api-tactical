import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/actor-round.repository';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError } from '../../../../shared/domain/errors';
import { ActionDeletedEvent } from '../../../domain/events/action-events';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import { DeleteActionCommand } from '../commands/delete-action.command';

/** Deletes an action and frees the AP it took in the ledger of its actor round (spec 011, §2). */
@CommandHandler(DeleteActionCommand)
export class DeleteActionHandler implements ICommandHandler<DeleteActionCommand> {
  private readonly logger = new Logger(DeleteActionHandler.name);

  constructor(
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
  ) {}

  async execute(command: DeleteActionCommand): Promise<void> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);

    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);
    (await this.gameRepository.findById(action.gameId))?.checkNotFinished();

    await this.actionRepository.deleteById(command.actionId);
    const actorRound = await this.actorRoundRepository.findByActorIdAndRound(action.gameId, action.actorId, action.round);
    if (actorRound?.releaseAction(action.id)) {
      await this.actorRoundRepository.update(actorRound.id, actorRound);
    }
    await this.actionEventBus.publish(new ActionDeletedEvent(action));
  }
}
