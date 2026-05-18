import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/actor-round.repository';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import { CombatAttackRollResolverService } from '../../services/combat';
import { UpdateAttackRollCommand } from '../commands/update-attack-roll.command';

@CommandHandler(UpdateAttackRollCommand)
export class UpdateAttackRollHandler implements ICommandHandler<UpdateAttackRollCommand, Action> {
  private readonly logger = new Logger(UpdateAttackRollHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
    private readonly combatAttackRollResolver: CombatAttackRollResolverService,
  ) {}

  async execute(command: UpdateAttackRollCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);

    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);

    const game = await this.gameRepository.findById(action.gameId);
    if (!game) throw new NotFoundError('Game', action.gameId);

    this.validateCommand(command, action);

    const attack = action.attacks!.find(a => a.attackName === command.attackName)!;
    const targetActor = await this.actorRoundRepository.findByActorIdAndRound(attack.modifiers.targetId!, action.round);
    if (!targetActor) throw new NotFoundError('ActorRound', attack.modifiers.targetId!);

    const sourceActor = await this.actorRoundRepository.findByActorIdAndRound(action.actorId, action.round);
    if (!sourceActor) throw new NotFoundError('ActorRound', action.actorId);

    await this.combatAttackRollResolver.resolve({
      action,
      attack,
      sourceActor,
      targetActor,
      roll: command.roll,
      locationRoll: command.locationRoll,
    });

    action.updatedAt = new Date();

    if (this.requiredBreakage(command.roll)) {
      sourceActor.addAttackBreakageAlert(attack.attackName);
      await this.actorRoundRepository.update(sourceActor.id, sourceActor);
      //TODO propagate change event
    }

    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return updated;
  }

  private validateCommand(command: UpdateAttackRollCommand, action: Action): void {
    if (!action.attacks || action.attacks.length === 0) {
      throw new ValidationError(`Action ${action.id} has no attacks`);
    }
    const attack = action.attacks.find(a => a.attackName === command.attackName);
    if (!attack) {
      throw new ValidationError(`Attack ${command.attackName} not found in action ${action.id}`);
    }
    if (!attack.calculated) {
      throw new ValidationError(`Attack ${command.attackName} has no calculated data`);
    }
    if (attack.calculated.requiredLocationRoll && !command.locationRoll) {
      throw new ValidationError(`Location roll is required for attack ${command.attackName}`);
    }
    action.checkValidRollDeclaration();
  }

  private requiredBreakage(roll: number): boolean {
    return roll === 33 || roll === 77;
  }
}
