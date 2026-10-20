import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import { AttackLocation } from '../../../domain/value-objects/attack-location.vo';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import type { CriticalTablePort } from '../../ports/critical-table.port';
import { CombatProcessor } from '../../services/combat';
import { UpdateCriticalRollCommand } from '../commands/update-critical-roll.command';

const MIN_CRITICAL_ROLL = 1;
const MAX_CRITICAL_ROLL = 100;

/** Location of a critical table result (limbs in singular) as an attack location, so the next criticals hit it too. */
const ATTACK_LOCATIONS: AttackLocation[] = ['head', 'chest', 'abdomen', 'arms', 'legs'];

const toAttackLocation = (location: string | undefined): AttackLocation | undefined => {
  const value = location === 'arm' ? 'arms' : location === 'leg' ? 'legs' : location;
  return ATTACK_LOCATIONS.find(candidate => candidate === value);
};

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
    if (!attack.results?.criticals?.some(c => c.key === command.criticalKey)) {
      throw new ValidationError(`Critical ${command.criticalKey} not found in attack ${command.attackName}`);
    }

    const criticalRolls = attack.roll!.criticalRolls;
    attack.roll!.criticalRolls = criticalRolls instanceof Map ? criticalRolls : new Map(Object.entries(criticalRolls || {}));
    // §9.8: every critical of the attack uses the same roll and the same location. The first roll resolves all of
    // them; a different roll for another one is rejected.
    const previous = [...attack.roll!.criticalRolls.values()].find(roll => roll !== undefined && roll !== null);
    if (previous !== undefined && previous !== command.roll) {
      throw new ValidationError(
        `The criticals of attack ${command.attackName} share the roll ${previous}, not ${command.roll}`,
        'err-critical-roll-mismatch',
      );
    }
    let location = attack.calculated?.location;
    for (const each of attack.results.criticals) {
      const ctx = await this.combatProcessor.runPhase('criticalRoll', {
        action,
        attack,
        criticalKey: each.key,
        criticalRoll: command.roll,
        location,
        trace: [],
      });
      // The raw roll is stored; the adjusted one goes in the critical.
      attack.roll!.criticalRolls.set(each.key, command.roll);
      each.adjustedRoll = Math.min(Math.max(ctx.criticalRoll ?? command.roll, MIN_CRITICAL_ROLL), MAX_CRITICAL_ROLL);
      each.result = await this.criticalTablePort.lookup({
        criticalType: each.criticalType,
        criticalSeverity: each.criticalSeverity,
        roll: each.adjustedRoll,
        location: ctx.location ?? location,
      });
      each.status = 'completed';
      location = location ?? toAttackLocation(each.result.location);
    }
    action.refreshAttackStatuses();

    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return updated;
  }
}
