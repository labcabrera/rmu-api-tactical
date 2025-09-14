/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import type { AttackPort } from '../../ports/attack.port';
import { UpdateAttackRollCommand } from '../commands/update-attack-roll.command';

@CommandHandler(UpdateAttackRollCommand)
export class UpdateAttackRollHandler implements ICommandHandler<UpdateAttackRollCommand, Action> {
  private readonly logger = new Logger(UpdateAttackRollHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('AttackPort') private readonly attackPort: AttackPort,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
  ) {}

  async execute(command: UpdateAttackRollCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) {
      throw new NotFoundError('Action', command.actionId);
    }
    const game = await this.gameRepository.findById(action.gameId);
    if (!game) {
      throw new NotFoundError('Game', action.gameId);
    }
    const attacks = action.attacks!;
    action.checkValidRollDeclaration();
    const attack = attacks.find((a) => a.modifiers.attackName === command.attackName);
    if (!attack) {
      throw new ValidationError(`Attack ${command.attackName} not found in action ${action.id}`);
    }
    attack.roll = {
      roll: command.roll,
      location: command.location,
      criticalRolls: undefined,
    };
    const attackResponse = await this.attackPort.updateRoll(attack.externalAttackId!, command.roll, command.location);
    if (!attackResponse.results?.criticals) {
      attack.roll.criticalRolls = undefined;
    } else {
      const criticalRolls: Record<string, number | undefined> = {};
      attackResponse.results.criticals.forEach((critical) => {
        Object.assign(criticalRolls, { [critical.key]: undefined });
      });
      attack.roll.criticalRolls = criticalRolls;
    }

    action.updatedAt = new Date();
    attack.results = attackResponse.results;
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return action;
  }
}
