import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/entities/action.aggregate';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import type { AttackClientPort } from '../../ports/attack-client.port';
import { PrepareManeuverCommand } from '../commands/prepare-maneuver.command';

@CommandHandler(PrepareManeuverCommand)
export class PrepareManeuverHandler implements ICommandHandler<PrepareManeuverCommand, Action> {
  private readonly logger = new Logger(PrepareManeuverHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('AttackClient') private readonly attackClient: AttackClientPort,
    @Inject('ActionEventProducer') private readonly actionEventProducer: ActionEventBusPort,
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
    await this.actionEventProducer.updated(updated);
    return updated;
  }
}
