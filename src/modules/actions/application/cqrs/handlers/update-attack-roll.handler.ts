import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/actor-round.repository';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import { ActionStatus } from '../../../domain/value-objects/action-status.vo';
import { AttackLocation } from '../../../domain/value-objects/attack-location.vo';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import type { AttackPort } from '../../ports/attack.port';
import { UpdateAttackRollCommand } from '../commands/update-attack-roll.command';

@CommandHandler(UpdateAttackRollCommand)
export class UpdateAttackRollHandler implements ICommandHandler<UpdateAttackRollCommand, Action> {
  private readonly logger = new Logger(UpdateAttackRollHandler.name);

  locationMap: Array<{ range: [number, number]; location: AttackLocation }> = [
    { range: [1, 1], location: 'head' },
    { range: [2, 3], location: 'chest' },
    { range: [4, 5], location: 'abdomen' },
    { range: [6, 10], location: 'legs' },
    { range: [11, 15], location: 'arms' },
    { range: [16, 20], location: 'head' },
    { range: [21, 25], location: 'chest' },
    { range: [26, 35], location: 'abdomen' },
    { range: [36, 45], location: 'legs' },
    { range: [46, 55], location: 'arms' },
    { range: [56, 65], location: 'arms' },
    { range: [66, 66], location: 'abdomen' },
    { range: [67, 75], location: 'legs' },
    { range: [76, 80], location: 'chest' },
    { range: [81, 85], location: 'head' },
    { range: [86, 90], location: 'arms' },
    { range: [91, 95], location: 'legs' },
    { range: [96, 97], location: 'abdomen' },
    { range: [98, 99], location: 'chest' },
    { range: [100, 100], location: 'head' },
  ];

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('AttackPort') private readonly attackPort: AttackPort,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
  ) {}

  async execute(command: UpdateAttackRollCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);

    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);

    const game = await this.gameRepository.findById(action.gameId);
    if (!game) throw new NotFoundError('Game', action.gameId);

    this.validateCommand(command, action);

    const attack = action.attacks!.find((a) => a.attackName === command.attackName)!;
    const calculated = attack.calculated!;

    const targetActor = await this.actorRoundRepository.findByActorIdAndRound(attack.modifiers.targetId!, action.round);
    if (!targetActor) throw new NotFoundError('ActorRound', attack.modifiers.targetId!);

    calculated.location = calculated.requiredLocationRoll ? this.getLocation(command.locationRoll!) : undefined;

    attack.roll = {
      roll: command.roll,
      locationRoll: command.locationRoll,
      criticalRolls: undefined,
      fumbleRoll: undefined,
    };
    const attackResponse = await this.attackPort.updateRoll(
      attack.externalAttackId!,
      command.roll,
      calculated.location,
    );
    if (!attackResponse || !attackResponse.results) throw new ValidationError('Attack service did not return results');

    if (attackResponse.results.criticals && attackResponse.results.criticals.length > 0) {
      attack.roll.criticalRolls = new Map<string, number | undefined>();
      attackResponse.results.criticals.forEach((critical) => {
        attack.roll!.criticalRolls!.set(critical.key, undefined);
      });
    }

    attack.status = attackResponse.status;
    attack.results = attackResponse.results;
    attack.calculated!.rollModifiers = attackResponse.calculated.rollModifiers;
    attack.calculated!.rollTotal = attackResponse.calculated.rollTotal;

    action.updatedAt = new Date();
    action.status = this.calculateStatus(action);

    if (this.requiredBreakage(command.roll)) {
      const sourceActor = await this.actorRoundRepository.findByActorIdAndRound(action.actorId, action.round);
      if (!sourceActor) throw new NotFoundError('ActorRound', action.actorId);
      sourceActor.addAttackBreakageAlert(attack.attackName);
      await this.actorRoundRepository.update(sourceActor.id, sourceActor);
      //TODO propagate change event
    }

    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return updated;
  }

  private getLocation(locationRoll: number): AttackLocation | undefined {
    for (const entry of this.locationMap) {
      const [min, max] = entry.range;
      if (locationRoll >= min && locationRoll <= max) {
        return entry.location;
      }
    }

    return undefined;
  }

  private calculateStatus(action: Action): ActionStatus {
    for (const attack of action.attacks!) {
      if (attack.status !== 'pending_apply') {
        return 'prepared';
      }
    }
    return 'pending_apply';
  }

  private validateCommand(command: UpdateAttackRollCommand, action: Action): void {
    if (!action.attacks || action.attacks.length === 0) {
      throw new ValidationError(`Action ${action.id} has no attacks`);
    }
    const attack = action.attacks.find((a) => a.attackName === command.attackName);
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
