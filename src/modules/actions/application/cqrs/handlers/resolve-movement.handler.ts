import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/actor-round.repository';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import type { Character, CharacterPort } from '../../../../strategic/application/ports/character.port';
import type { StrategicGame, StrategicGamePort } from '../../../../strategic/application/ports/strategic-game.port';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import { ActionMovement, ActionMovementModifiers } from '../../../domain/value-objects/action-movement.vo';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import { MovementProcessorService } from '../../services/movement-processor.service';
import { ResolveMovementCommand } from '../commands/resolve-movement.command';

@CommandHandler(ResolveMovementCommand)
export class ResolveMovementHandler implements ICommandHandler<ResolveMovementCommand, Action> {
  private readonly logger = new Logger(ResolveMovementHandler.name);

  constructor(
    @Inject() private readonly movementProcessorService: MovementProcessorService,
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('CharacterClient') private readonly characterClient: CharacterPort,
    @Inject('StrategicGameClient') private readonly strategicGameClient: StrategicGamePort,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
  ) {}

  async execute(command: ResolveMovementCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) {
      throw new NotFoundError('Action', command.actionId);
    }
    const game = await this.gameRepository.findById(action.gameId);
    if (!game) {
      throw new NotFoundError('Game', action.gameId);
    }
    this.validate(command, action);
    const [actorRound, character, strategicGame] = await Promise.all([
      this.actorRoundRepository.findByActorIdAndRound(action.actorId, action.round),
      this.characterClient.findById(action.actorId),
      this.strategicGameClient.findById(game.strategicGameId),
    ]);
    if (!actorRound) throw new NotFoundError('ActorRound', `${action.actorId} - ${action.round}`);
    if (!character) throw new NotFoundError('Character', action.actorId);
    if (!strategicGame) throw new NotFoundError('StrategicGame', game.strategicGameId);

    const currentPhase = game.phase.replace('phase_', '') as unknown as number;
    await this.processAction(command, action, character, actorRound, strategicGame, currentPhase);
    const updated = await this.actionRepository.update(action.id, action);
    if (action.fatigue) {
      const currentFatigue = actorRound.fatigue.accumulator || 0;
      actorRound.fatigue.accumulator = currentFatigue + action.fatigue;
      await this.actorRoundRepository.update(actorRound.id, actorRound);
    }
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return updated;
  }

  private async processAction(
    command: ResolveMovementCommand,
    action: Action,
    character: Character,
    actorRound: ActorRound,
    strategicGame: StrategicGame,
    currentPhase: number,
  ): Promise<void> {
    action.description = command.description;
    action.phaseEnd = currentPhase;
    action.actionPoints = action.phaseEnd - action.phaseStart + 1;
    action.movement = this.buildActionMovement(command);
    await this.movementProcessorService.process(command.roll, action, character, actorRound);
    action.processFatigue(strategicGame.options?.fatigueMultiplier);
    const scale = strategicGame.options?.boardScaleMultiplier || 1;
    action.movement.calculated.distanceAdjusted = action.movement.calculated.distance * scale;
    this.roundResults(action);
    action.status = 'completed';
    action.updatedAt = new Date();
  }

  private buildActionMovement(command: ResolveMovementCommand): ActionMovement {
    return {
      modifiers: this.buildActionMovementModifers(command),
      roll: undefined,
      calculated: {
        bmr: 0,
        paceMultiplier: 0,
        percent: 0,
        distance: 0,
        distanceAdjusted: 0,
        critical: undefined,
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
      customBonus: 0,
    };
  }

  private validate(command: ResolveMovementCommand, action: Action): void {
    if (action.actionType !== 'movement') {
      throw new ValidationError('Action is not a movement action');
    } else if (action.status === 'completed') {
      throw new ValidationError('Action is already completed');
    }
    if (command.modifiers.requiredManeuver === true) {
      if (!command.roll) {
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
