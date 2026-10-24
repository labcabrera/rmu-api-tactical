import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { Action } from '../../../domain/aggregates/action.js';
import { ActionUpdatedEvent } from '../../../domain/events/action.events.js';
import { ActionAttack } from '../../../domain/value-objects/action-attack.vo.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { CombatModifierBag, CombatProcessor, PARRY_PHASE } from '../../services/combat/index.js';
import { DeclareParryCommand } from '../commands/declare-parry.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(DeclareParryCommand)
export class DeclareParryHandler implements ICommandHandler<DeclareParryCommand, Action> {
  private readonly logger = new Logger(DeclareParryHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
    private readonly combatProcessor: CombatProcessor,
  ) {}

  async execute(command: DeclareParryCommand): Promise<Action> {
    this.logger.log(`Processing parry for action ${command.actionId} for user ${command.userId}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);

    const game = await this.gameRepository.findById(action.gameId);
    if (!game) throw new NotFoundError('Game', action.gameId);
    game.checkNotFinished();

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
      // A parry carried over from an earlier action against this foe is fixed: its OB is already spent.
      if (parry.carriedOver) {
        return;
      }
      if (parryItem.parry < 0 || parryItem.parry > parry.parryAvailable) {
        throw new ValidationError(`Parry must be between 0 and ${parry.parryAvailable}`);
      }
      parry.parry = parryItem.parry;
    });

    // The parries of one actor share its available parry; protecting also spends the protect penalty.
    const byActor = new Map<string, { total: number; available: number }>();
    action.parries
      ?.filter(parry => !parry.carriedOver)
      .forEach(parry => {
        const penalty = -(parry.penalty || 0);
        const entry = byActor.get(parry.actorId) || { total: 0, available: 0 };
        entry.total += (parry.parry || 0) + (parry.parry > 0 ? penalty : 0);
        entry.available = Math.max(entry.available, parry.parryAvailable + penalty);
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
    await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
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
