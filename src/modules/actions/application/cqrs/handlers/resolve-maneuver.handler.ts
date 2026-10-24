import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRoundAlert } from '../../../../actor-rounds/domain/value-objects/actor-round-alert.vo.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { Action } from '../../../domain/aggregates/action.js';
import { ActionUpdatedEvent } from '../../../domain/events/action.events.js';
import { ActionManeuverResult } from '../../../domain/value-objects/action-maneuver.vo.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { type ManeuverPort, MANEUVER_PORT } from '../../ports/maneuver.port.js';
import {
  type ManeuverContext,
  ManeuverContextService,
  type ManeuverRollCalculation,
} from '../../services/maneuver/maneuver-context.service.js';
import { ResolveManeuverCommand } from '../commands/resolve-maneuver.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

/** Unmodified roll of an unusual event (§5.1). */
const UNUSUAL_EVENT_ROLL = 66;

/** Percent a task needs to be complete (§5.1). */
const COMPLETED_PERCENT = 100;

/** Critical type of the alert of a moving maneuver gone wrong, as the movement roll uses it. */
const MOVING_MANEUVER_CRITICAL_TYPE = 'k';

@CommandHandler(ResolveManeuverCommand)
export class ResolveManeuverHandler implements ICommandHandler<ResolveManeuverCommand, Action> {
  private readonly logger = new Logger(ResolveManeuverHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
    @Inject(MANEUVER_PORT) private readonly maneuverPort: ManeuverPort,
    private readonly maneuverContextService: ManeuverContextService,
  ) {}

  async execute(command: ResolveManeuverCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);

    const game = await this.gameRepository.findById(action.gameId);
    if (!game) throw new NotFoundError('Game', action.gameId);
    game.checkNotFinished();

    this.validate(command, action);
    const currentPhase = parseInt((game.phase || '').replace('phase_', ''));
    if (Number.isNaN(currentPhase)) {
      throw new ValidationError(`Phase ${game.phase} does not allow resolving actions`);
    }

    // The AP come from the ledger (spec 011, §2); the range from the profile of the skill rolled.
    const request = command.request;
    const context = await this.maneuverContextService.load(action, game, {
      skillId: request.skillId,
      specialization: request.specialization,
      maneuverType: request.maneuverType,
    });
    const range = context.profile.actionPoints;
    action.apRange = range ? { min: range.min, max: range.max } : null;
    action.checkResolvable(context.actorRound, currentPhase);
    action.actionPoints = action.apOf(context.actorRound, currentPhase);
    const calculation = this.maneuverContextService.calculate(context, request, command.roll.roll);
    this.updateModifiers(action, command, context, calculation);
    action.maneuver!.roll = { modifiers: calculation.modifiers, roll: command.roll.roll, totalRoll: calculation.total };

    const alert =
      context.maneuverType === 'percent'
        ? await this.resolvePercent(action, context, calculation.total)
        : await this.resolveAbsolute(action, context, calculation.total, command.roll.unmodified === UNUSUAL_EVENT_ROLL);

    action.close(context.actorRound, currentPhase);
    const updated = await this.actionRepository.update(action.id, action);
    if (alert) {
      context.actorRound.alerts.push(alert);
      await this.actorRoundRepository.update(context.actorRound.id, context.actorRound);
    }
    await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
    updated.refreshApState(context.actorRound, currentPhase);
    return updated;
  }

  private validate(command: ResolveManeuverCommand, action: Action): void {
    if (action.actionType !== 'maneuver' || !action.maneuver) {
      throw new ValidationError('Action is not a maneuver action');
    } else if (action.status === 'completed') {
      throw new ValidationError('Action is already completed');
    } else if (!command.roll || typeof command.roll.roll !== 'number' || !Number.isFinite(command.roll.roll)) {
      // A total of 0 is a valid roll (an absolute failure).
      throw new ValidationError('Required roll value');
    }
  }

  private updateModifiers(
    action: Action,
    command: ResolveManeuverCommand,
    context: ManeuverContext,
    calculation: ManeuverRollCalculation,
  ): void {
    const request = command.request;
    action.maneuver!.modifiers = {
      ...action.maneuver!.modifiers,
      skillId: context.skill.skillId,
      specialization: context.skill.specialization,
      maneuverType: context.maneuverType,
      difficulty: request.difficulty || action.maneuver!.modifiers.difficulty || 'm',
      light: request.light,
      lightModifier: calculation.lightUsage,
      customBonus: request.customBonus,
      selections: request.selections,
      passiveTotal: request.passiveTotal,
      armorModifier: undefined,
    };
  }

  /** Absolute maneuver: the result table of the skill's profile (M3), with the unusual event of an unmodified 66. */
  private async resolveAbsolute(
    action: Action,
    context: ManeuverContext,
    total: number,
    unusualEvent: boolean,
  ): Promise<ActorRoundAlert | null> {
    const result = await this.maneuverPort.absolute(total, context.profile.resultTable, unusualEvent);
    action.maneuver!.result = new ActionManeuverResult(
      result.result,
      undefined,
      result.message,
      result.effects ?? [],
      undefined,
      undefined,
      unusualEvent || undefined,
    );
    return null;
  }

  /**
   * Percent maneuver (M1, §4.4 of spec 010): the percent adds up to the progress the action inherited; a critical or
   * a failure to act adds nothing. A critical of a maneuver needing freedom of movement raises an alert, as movement.
   */
  private async resolvePercent(action: Action, context: ManeuverContext, total: number): Promise<ActorRoundAlert | null> {
    const result = await this.maneuverPort.percent(total);
    const critical = result.critical || null;
    const gained = critical ? 0 : result.percent || 0;
    const progress = (action.maneuver!.progress ?? 0) + gained;
    action.maneuver!.progress = progress;
    action.maneuver!.result = new ActionManeuverResult(
      undefined,
      result.percent,
      result.message,
      undefined,
      critical,
      progress >= COMPLETED_PERCENT,
    );
    if (critical && context.profile.movement) {
      return ActorRoundAlert.buildCritical(MOVING_MANEUVER_CRITICAL_TYPE, critical);
    }
    return null;
  }
}
