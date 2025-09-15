import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import type { AttackPort } from '../../ports/attack.port';
import { UpdateCriticalRollCommand } from '../commands/update-critical-roll.command';

@CommandHandler(UpdateCriticalRollCommand)
export class UpdateCriticalRollHandler implements ICommandHandler<UpdateCriticalRollCommand, Action> {
  private readonly logger = new Logger(UpdateCriticalRollHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('AttackPort') private readonly attackPort: AttackPort,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
  ) {}

  async execute(command: UpdateCriticalRollCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) {
      throw new NotFoundError('Action', command.actionId);
    }
    const game = await this.gameRepository.findById(action.gameId);
    if (!game) {
      throw new NotFoundError('Game', action.gameId);
    }
    action.checkValidCriticalRollDeclaration(command.attackName, command.criticalKey, command.roll);
    const attack = action.getAttackByName(command.attackName);
    attack.roll!.criticalRolls![command.criticalKey] = command.roll;

    const attackResponse = await this.attackPort.updateCriticalRoll(attack.externalAttackId!, command.criticalKey, command.roll);
    attack.results = attackResponse.results;
    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return action;
  }
}
