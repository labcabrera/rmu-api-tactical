import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import { PrepareManeuverCommand } from '../commands/prepare-maneuver.command';

@CommandHandler(PrepareManeuverCommand)
export class PrepareManeuverHandler implements ICommandHandler<PrepareManeuverCommand, Action> {
  private readonly logger = new Logger(PrepareManeuverHandler.name);

  constructor(
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
  ) {}

  async execute(command: PrepareManeuverCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) {
      throw new NotFoundError('Action', command.actionId);
    }
    if (action.actionType !== 'maneuver') {
      throw new ValidationError('Action is not a maneuver');
    }
    if (action.status !== 'declared') {
      throw new ValidationError('Action is not in a preparable state');
    }
    if (!action.maneuver) {
      throw new ValidationError('Required maneuver data is missing');
    }
    action.status = 'in_progress';
    action.maneuver.difficulty = command.difficulty;
    const updated = await this.actionRepository.save(action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return updated;
  }
}
