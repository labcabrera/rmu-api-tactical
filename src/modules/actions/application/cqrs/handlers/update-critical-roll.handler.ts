import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import type { CriticalTablePort } from '../../ports/critical-table.port';
import { CombatProcessor } from '../../services/combat';
import { UpdateCriticalRollCommand } from '../commands/update-critical-roll.command';

const MIN_CRITICAL_ROLL = 1;
const MAX_CRITICAL_ROLL = 100;

@CommandHandler(UpdateCriticalRollCommand)
export class UpdateCriticalRollHandler implements ICommandHandler<UpdateCriticalRollCommand, Action> {
  private readonly logger = new Logger(UpdateCriticalRollHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('CriticalTablePort') private readonly criticalTablePort: CriticalTablePort,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
    private readonly combatProcessor: CombatProcessor,
  ) {}

  async execute(command: UpdateCriticalRollCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);

    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);

    const game = await this.gameRepository.findById(action.gameId);
    if (!game) throw new NotFoundError('Game', action.gameId);

    action.checkValidCriticalRollDeclaration(command.attackName, command.criticalKey, command.roll);
    const attack = action.getAttackByName(command.attackName);
    const critical = attack.results?.criticals?.find(c => c.key === command.criticalKey);
    if (!critical) {
      throw new ValidationError(`Critical ${command.criticalKey} not found in attack ${command.attackName}`);
    }

    const ctx = await this.combatProcessor.runPhase('criticalRoll', {
      action,
      attack,
      criticalKey: command.criticalKey,
      criticalRoll: command.roll,
      location: attack.calculated?.location,
      trace: [],
    });
    const adjustedRoll = Math.min(Math.max(ctx.criticalRoll ?? command.roll, MIN_CRITICAL_ROLL), MAX_CRITICAL_ROLL);

    const criticalRolls = attack.roll!.criticalRolls;
    attack.roll!.criticalRolls = criticalRolls instanceof Map ? criticalRolls : new Map(Object.entries(criticalRolls || {}));
    // The raw roll is stored; the adjusted one goes in the critical.
    attack.roll!.criticalRolls.set(command.criticalKey, command.roll);
    critical.adjustedRoll = adjustedRoll;
    critical.result = await this.criticalTablePort.lookup({
      criticalType: critical.criticalType,
      criticalSeverity: critical.criticalSeverity,
      roll: adjustedRoll,
      location: ctx.location,
    });
    critical.status = 'completed';
    action.refreshAttackStatuses();

    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return updated;
  }
}
