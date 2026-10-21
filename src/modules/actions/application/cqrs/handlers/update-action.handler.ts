import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import { ActionApStateService } from '../../services/action-ap-state.service';
import { UpdateActionCommand } from '../commands/update-action.command';

/** `PATCH /v1/actions/:id`: only the description changes. */
@CommandHandler(UpdateActionCommand)
export class UpdateActionHandler implements ICommandHandler<UpdateActionCommand, Action> {
  private readonly logger = new Logger(UpdateActionHandler.name);

  constructor(
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
    private readonly apStateService: ActionApStateService,
  ) {}

  async execute(command: UpdateActionCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);
    if (command.description !== undefined) {
      action.description = command.description;
    }
    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action.id, { description: action.description, updatedAt: action.updatedAt });
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    await this.apStateService.refresh([updated]);
    return updated;
  }
}
