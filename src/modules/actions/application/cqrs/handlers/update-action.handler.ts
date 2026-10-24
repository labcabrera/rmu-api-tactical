import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { Action } from '../../../domain/aggregates/action.js';
import { ActionUpdatedEvent } from '../../../domain/events/action.events.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { ActionApStateService } from '../../services/action-ap-state.service.js';
import { UpdateActionCommand } from '../commands/update-action.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

/** `PATCH /v1/actions/:id`: only the description changes. */
@CommandHandler(UpdateActionCommand)
export class UpdateActionHandler implements ICommandHandler<UpdateActionCommand, Action> {
  private readonly logger = new Logger(UpdateActionHandler.name);

  constructor(
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
    private readonly apStateService: ActionApStateService,
  ) {}

  async execute(command: UpdateActionCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);
    action.checkVersion(command.expectedVersion);
    (await this.gameRepository.findById(action.gameId))?.checkNotFinished();
    if (command.description !== undefined) {
      action.description = command.description;
    }
    // Nothing changed: no write and no event (spec 021, decision 9) [F-tactical-19].
    if (!action.hasChanges()) {
      await this.apStateService.refresh([action]);
      return action;
    }
    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action);
    await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
    await this.apStateService.refresh([updated]);
    return updated;
  }
}
