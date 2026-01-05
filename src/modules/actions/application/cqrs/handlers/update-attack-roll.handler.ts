import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/out/actor-round.repository';
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

    const attacks = action.attacks!;
    action.checkValidRollDeclaration();

    const attack = attacks.find((a) => a.attackName === command.attackName);
    if (!attack) throw new ValidationError(`Attack ${command.attackName} not found in action ${action.id}`);

    const modifiers = attack.modifiers;

    const targetActor = await this.actorRoundRepository.findByActorIdAndRound(attack.modifiers.targetId!, action.round);
    if (!targetActor) throw new NotFoundError('ActorRound', attack.modifiers.targetId!);

    const requiredLocationRoll = !targetActor?.defense.at;

    let location: AttackLocation | undefined = undefined;
    if (requiredLocationRoll) {
      if (modifiers.calledShot && attack.modifiers.calledShot != 'none') {
        location = attack.modifiers.calledShot;
      } else if (command.locationRoll) {
        location = this.getLocation(command.locationRoll);
      } else {
        throw new ValidationError('Location roll is required using different armor types');
      }
      attack.calculated!.location = location;
    }

    attack.roll = {
      roll: command.roll,
      locationRoll: command.locationRoll,
      criticalRolls: undefined,
      fumbleRoll: undefined,
    };
    const attackResponse = await this.attackPort.updateRoll(attack.externalAttackId!, command.roll, location);
    if (!attackResponse || !attackResponse.results) throw new ValidationError('Attack service did not return results');

    if (attackResponse.results.criticals && attackResponse.results.criticals.length > 0) {
      attack.roll.criticalRolls = new Map<string, number | undefined>();
      attackResponse.results.criticals.forEach((critical) => {
        attack.roll!.criticalRolls!.set(critical.key, undefined);
      });
    }

    attack.status = attackResponse.status;
    attack.results = attackResponse.results;

    action.updatedAt = new Date();
    action.status = this.calculateStatus(action);

    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return updated;
  }

  private getLocation(locationRoll: number): AttackLocation | undefined {
    const locationMap: Array<{ range: [number, number]; location: AttackLocation }> = [
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

    for (const entry of locationMap) {
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
}
