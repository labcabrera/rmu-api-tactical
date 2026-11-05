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
import { DeclareParryCommand, type DeclareShieldManeuverItem } from '../commands/declare-parry.command.js';
import { type ManeuverPort, MANEUVER_PORT } from '../../ports/maneuver.port.js';
import { DIFFICULTY_MAP } from '../../../domain/value-objects/difficulty.vo.js';
import {
  SHIELD_MANEUVER_DEFAULT_DIFFICULTY,
  SHIELD_MANEUVER_PASSED_RESULTS,
  SHIELD_MANEUVER_TABLE,
} from '../../../domain/value-objects/shield-maneuver.vo.js';
import type { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
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
    @Inject(MANEUVER_PORT) private readonly maneuverPort: ManeuverPort,
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

    // Workspace spec 077, decisions A1.3-A1.5: one Shield maneuver per attack that needs it
    for (const item of command.shieldManeuvers ?? []) {
      await this.resolveShieldManeuver(action, item, actorRounds);
    }

    // Set up parry values in attacks
    action.applyParrysToAttacks();

    for (const attack of attacks) {
      await this.refreshAttackCalculation(action, attack);
    }

    // Update action and publish events. It stays in the parry step while a Shield maneuver is pending.
    action.status = action.hasPendingShieldManeuvers() ? 'parry' : 'pending_roll';
    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action);
    await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
    return updated;
  }

  /**
   * Workspace spec 077, decisions A1.3-A1.4: an absolute Shield maneuver on the generic table (roll, the defender's
   * Shield skill and penalties, and the difficulty, medium by default), or the game master's `passed` without a roll,
   * kept as `manual`. A maneuver sent for an attack that does not need it is `err-shield-maneuver-not-needed`.
   */
  private async resolveShieldManeuver(action: Action, item: DeclareShieldManeuverItem, actorRounds: ActorRound[]): Promise<void> {
    const attack = action.getAttackByName(item.attackName);
    const maneuver = attack.shieldManeuver;
    if (!maneuver?.required) {
      throw new ValidationError(`The attack ${item.attackName} needs no Shield maneuver`, 'err-shield-maneuver-not-needed', {
        attackName: item.attackName,
      });
    }
    const hasRoll = item.roll !== undefined && item.roll !== null;
    if (!hasRoll) {
      if (item.passed === undefined || item.passed === null) {
        throw new ValidationError(`The Shield maneuver against ${item.attackName} needs a roll or passed`);
      }
      Object.assign(maneuver, {
        roll: null,
        difficulty: null,
        penalty: null,
        total: null,
        result: null,
        passed: item.passed,
        manual: true,
      });
      return;
    }
    const difficulty = item.difficulty ?? SHIELD_MANEUVER_DEFAULT_DIFFICULTY;
    const defender = actorRounds.find(actor => actor.actorId === maneuver.targetId);
    const penalty = Math.min(0, defender?.getPenaltySum() ?? 0);
    const total = item.roll + maneuver.skill + penalty + (DIFFICULTY_MAP.get(difficulty) ?? 0);
    const response = await this.maneuverPort.absolute(total, SHIELD_MANEUVER_TABLE);
    Object.assign(maneuver, {
      roll: item.roll,
      difficulty,
      penalty,
      total,
      result: response.result,
      passed: SHIELD_MANEUVER_PASSED_RESULTS.includes(response.result),
      manual: false,
    });
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
    const ctx = await this.combatProcessor.runPhase(PARRY_PHASE, { action, attack, trace: [], skipped: [] });
    // A parry declared again replaces the rules its phase skipped
    attack.calculated.skipped = [...(attack.calculated.skipped ?? []).filter(rule => rule.phase !== PARRY_PHASE), ...ctx.skipped!];
    attack.calculated.rollTotal = CombatModifierBag.from(attack.calculated.rollModifiers).sum();
  }
}
