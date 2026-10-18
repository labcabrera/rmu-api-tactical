import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/actor-round.repository';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import { ActionAttack } from '../../../domain/value-objects/action-attack.vo';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import { CombatModifierBag, CombatProcessor, PARRY_PHASE } from '../../services/combat';
import { DeclareParryCommand } from '../commands/declare-parry.command';

@CommandHandler(DeclareParryCommand)
export class DeclareParryHandler implements ICommandHandler<DeclareParryCommand, Action> {
  private readonly logger = new Logger(DeclareParryHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
    private readonly combatProcessor: CombatProcessor,
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
      if (parryItem.parry < 0 || parryItem.parry > parry.parryAvailable) {
        throw new ValidationError(`Parry must be between 0 and ${parry.parryAvailable}`);
      }
      parry.parry = parryItem.parry;
    });

    // The parries of one actor share its available parry.
    const byActor = new Map<string, { total: number; available: number }>();
    action.parries?.forEach(parry => {
      const entry = byActor.get(parry.actorId) || { total: 0, available: parry.parryAvailable };
      entry.total += parry.parry || 0;
      entry.available = Math.max(entry.available, parry.parryAvailable);
      byActor.set(parry.actorId, entry);
    });
    byActor.forEach(({ total, available }) => {
      if (total > available) throw new ValidationError(`Parries add up to ${total}, above the ${available} available`);
    });

    // Set up parry values in attacks
    action.applyParrysToAttacks();

    for (const attack of attacks) {
      await this.refreshAttackCalculation(action, attack);
    }

    // Update action and publish events
    action.status = 'pending_roll';
    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return updated;
  }

  private resolveActorIds(action: Action): string[] {
    const actorIds = new Set<string>();
    actorIds.add(action.actorId);
    action.attacks?.forEach(attack => {
      actorIds.add(attack.modifiers.targetId!);
    });
    return Array.from(actorIds);
  }

  private async refreshAttackCalculation(action: Action, attack: ActionAttack): Promise<void> {
    if (!attack.calculated) {
      return;
    }
    await this.combatProcessor.runPhase(PARRY_PHASE, { action, attack, trace: [] });
    attack.calculated.rollTotal = CombatModifierBag.from(attack.calculated.rollModifiers).sum();
  }
}
