import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundAlert } from '../../../../actor-rounds/domain/value-objects/actor-round-alert.vo.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import {
  type StrategicGame,
  type StrategicGamePort,
  STRATEGIC_GAME_PORT,
} from '../../../../strategic/application/ports/strategic-game.port.js';
import { Action } from '../../../domain/aggregates/action.js';
import { ActionUpdatedEvent } from '../../../domain/events/action.events.js';
import { ActionMovement, ActionMovementModifiers } from '../../../domain/value-objects/action-movement.vo.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { MovementProcessorService } from '../../services/movement-processor.service.js';
import { ResolveMovementCommand } from '../commands/resolve-movement.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

@CommandHandler(ResolveMovementCommand)
export class ResolveMovementHandler implements ICommandHandler<ResolveMovementCommand, Action> {
  private readonly logger = new Logger(ResolveMovementHandler.name);

  constructor(
    private readonly movementProcessorService: MovementProcessorService,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(STRATEGIC_GAME_PORT) private readonly strategicGameClient: StrategicGamePort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(command: ResolveMovementCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);

    const game = await this.gameRepository.findById(action.gameId);
    if (!game) throw new NotFoundError('Game', action.gameId);

    this.validate(command, action);
    const [actorRound, strategicGame] = await Promise.all([
      this.actorRoundRepository.findByActorIdAndRound(action.gameId, action.actorId, action.round),
      this.strategicGameClient.findById(game.strategicGameId),
    ]);
    if (!actorRound) throw new NotFoundError('ActorRound', `${action.actorId} - ${action.round}`);
    if (!strategicGame) throw new NotFoundError('StrategicGame', game.strategicGameId);

    const currentPhase = game.getActionPhase();
    action.checkResolvable(actorRound, currentPhase);
    await this.processAction(command, action, actorRound, strategicGame, currentPhase);
    const updated = await this.actionRepository.update(action);
    let actorRoundModified = false;
    if (action.fatigue) {
      actorRoundModified = true;
      const currentFatigue = actorRound.fatigue.accumulator || 0;
      actorRound.fatigue.accumulator = currentFatigue + action.fatigue;
    }
    if (action.movement?.calculated.critical) {
      actorRoundModified = true;
      const alert = ActorRoundAlert.buildCritical('k', action.movement?.calculated.critical);
      actorRound.alerts.push(alert);
    }
    if (actorRoundModified) {
      await this.actorRoundRepository.update(actorRound);
    }
    await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
    updated.refreshApState(actorRound, currentPhase);
    return updated;
  }

  private async processAction(
    command: ResolveMovementCommand,
    action: Action,
    actorRound: ActorRound,
    strategicGame: StrategicGame,
    currentPhase: number,
  ): Promise<void> {
    action.description = command.description;
    // AP from the ledger (spec 011, §9). An instantaneous movement takes none, but covers the phases it spans.
    action.actionPoints = action.apOf(actorRound, currentPhase);
    const distanceActionPoints = action.freeAction ? Math.max(1, currentPhase - action.phaseStart + 1) : action.actionPoints;
    action.movement = this.buildActionMovement(command);
    const fatigueMultiplier = strategicGame.options?.fatigueMultiplier ?? 1;
    await this.movementProcessorService.process(command.roll, action, actorRound, distanceActionPoints);
    action.processFatigue(fatigueMultiplier);
    const scale = strategicGame.options?.boardScaleMultiplier || 1;
    action.movement.calculated.distanceAdjusted = action.movement.calculated.distance * scale;
    this.roundResults(action);
    action.close(actorRound, currentPhase);
  }

  private buildActionMovement(command: ResolveMovementCommand): ActionMovement {
    return {
      modifiers: this.buildActionMovementModifers(command),
      roll: null,
      calculated: {
        bmr: 0,
        paceMultiplier: 0,
        percent: 0,
        distance: 0,
        distanceAdjusted: 0,
        critical: null,
        description: 'Not processed',
      },
    };
  }

  private buildActionMovementModifers(command: ResolveMovementCommand): ActionMovementModifiers {
    return {
      pace: command.modifiers.pace,
      requiredManeuver: command.modifiers.requiredManeuver === true,
      skillId: command.modifiers.skillId,
      difficulty: command.modifiers.difficulty,
      customBonus: command.modifiers.customBonus,
      light: command.modifiers.light ?? null,
    };
  }

  private validate(command: ResolveMovementCommand, action: Action): void {
    if (action.actionType !== 'movement') {
      throw new ValidationError('Action is not a movement action');
    } else if (action.status === 'completed') {
      throw new ValidationError('Action is already completed');
    }
    if (command.modifiers.requiredManeuver === true) {
      if (command.roll === null || command.roll === undefined) {
        throw new ValidationError('Roll is required for a maneuver');
      }
      if (!command.modifiers.difficulty) {
        throw new ValidationError('Difficulty is required for a maneuver');
      }
      if (!command.modifiers.skillId) {
        throw new ValidationError('SkillId is required for a maneuver');
      }
    }
  }

  private roundResults(action: Action): void {
    if (action.movement) {
      action.movement.calculated.distance = Math.round(action.movement.calculated.distance * 10) / 10;
      action.movement.calculated.distanceAdjusted = Math.round(action.movement.calculated.distanceAdjusted * 10) / 10;
    }
  }
}
