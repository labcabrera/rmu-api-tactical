import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/actor-round.repository';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import { ActionAttack } from '../../../domain/value-objects/action-attack.vo';
import { KeyValueModifier } from '../../../domain/value-objects/key-value-modifier.vo';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import { DeclareParryCommand } from '../commands/declare-parry.command';

@CommandHandler(DeclareParryCommand)
export class DeclareParryHandler implements ICommandHandler<DeclareParryCommand, Action> {
  private readonly logger = new Logger(DeclareParryHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
  ) {}

  async execute(command: DeclareParryCommand): Promise<Action> {
    this.logger.log(`Processing parry for action ${command.actionId} for user ${command.userId}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);

    const game = await this.gameRepository.findById(action.gameId);
    if (!game) throw new NotFoundError('Game', action.gameId);

    const attacks = action.attacks!;
    action.checkValidParryDeclaration();

    const actorIds = this.resolveActorIds(action);
    const rsql = `gameId==${action.gameId};round==${game.round};actorId=in=(${actorIds.join(',')})`;
    const actorRounds = (await this.actorRoundRepository.findByRsql(rsql, 0, 1000)).content;
    if (actorIds.length !== actorRounds.length) {
      throw new ValidationError('Unable to find all actor rounds');
    }

    // Update attack parries with command values
    command.parries.forEach(parryItem => {
      const parry = action.parries?.find(p => p.id === parryItem.parryId);
      if (!parry) {
        throw new ValidationError(`Parry ${parryItem.parryId} not found`);
      }
      parry.parry = parryItem.parry;
    });

    // Set up parry values in attacks
    action.applyParrysToAttacks();

    attacks.forEach(attack => this.refreshAttackCalculation(attack));

    // Update action and publish events
    action.status = 'pending_roll';
    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return action;
  }

  private resolveActorIds(action: Action): string[] {
    const actorIds = new Set<string>();
    actorIds.add(action.actorId);
    action.attacks?.forEach(attack => {
      actorIds.add(attack.modifiers.targetId!);
    });
    return Array.from(actorIds);
  }

  private refreshAttackCalculation(attack: ActionAttack): void {
    if (!attack.calculated) {
      return;
    }

    const parry = attack.modifiers.parry || 0;
    const modifiers = attack.calculated.rollModifiers.filter(modifier => modifier.key !== 'parry');
    if (parry > 0) {
      modifiers.push(new KeyValueModifier('parry', -parry));
    }

    attack.calculated.rollModifiers = modifiers;
    attack.calculated.rollTotal = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
  }
}
