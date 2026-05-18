import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/actor-round.repository';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import type { FumbleTablePort } from '../../ports/fumble-table.port';
import { CombatRulesEngineService } from '../../services/combat';
import { UpdateFumbleRollCommand } from '../commands/update-fumble-roll.command';

@CommandHandler(UpdateFumbleRollCommand)
export class UpdateFumbleRollHandler implements ICommandHandler<UpdateFumbleRollCommand, Action> {
  private readonly logger = new Logger(UpdateFumbleRollHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('FumbleTablePort') private readonly fumbleTablePort: FumbleTablePort,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
    private readonly rulesEngine: CombatRulesEngineService,
  ) {}

  async execute(command: UpdateFumbleRollCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);

    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);

    const game = await this.gameRepository.findById(action.gameId);
    if (!game) throw new NotFoundError('Game', action.gameId);

    const attack = action.getAttackByName(command.attackName);
    if (!attack.results?.fumble) {
      throw new ValidationError(`Attack ${command.attackName} has no pending fumble`);
    }

    const sourceActor = await this.actorRoundRepository.findByActorIdAndRound(action.actorId, action.round);
    if (!sourceActor) throw new NotFoundError('ActorRound', action.actorId);
    const sourceAttack = sourceActor.attacks?.find(a => a.attackName === command.attackName);
    if (!sourceAttack) {
      throw new ValidationError(`Attack ${command.attackName} not found on actor ${action.actorId}`);
    }

    let ctx = await this.rulesEngine.runHook('combat.beforeFumble', {
      action,
      attack,
      fumbleRoll: command.fumbleRoll,
      sourceActor,
      sourceAttack,
      trace: [],
    });

    attack.roll!.fumbleRoll = ctx.fumbleRoll;
    attack.results.fumble = await this.fumbleTablePort.lookup({
      fumbleTable: sourceAttack.fumbleTable,
      roll: ctx.fumbleRoll!,
    });

    ctx = await this.rulesEngine.runHook('combat.afterFumble', ctx);

    if (!action.hasPendingCriticalRolls() && !action.hasPendingFumbleRolls()) {
      action.status = 'pending_apply';
      attack.status = 'pending_apply';
    } else if (action.hasPendingCriticalRolls()) {
      action.status = 'critical_or_fumble_roll';
      attack.status = 'pending_critical_roll';
    }
    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return action;
  }
}
