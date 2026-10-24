import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { ActionDeletedEvent } from '../../../domain/events/action.events.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { DeleteActionCommand } from '../commands/delete-action.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

/** Deletes an action and frees the AP it took in the ledger of its actor round (spec 011, §2). */
@CommandHandler(DeleteActionCommand)
export class DeleteActionHandler implements ICommandHandler<DeleteActionCommand> {
  private readonly logger = new Logger(DeleteActionHandler.name);

  constructor(
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
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
    await this.eventPublisher.publish('action', new ActionDeletedEvent(action));
  }
}
