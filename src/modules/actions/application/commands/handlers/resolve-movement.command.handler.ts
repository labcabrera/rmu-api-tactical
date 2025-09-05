/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import * as crr from '../../../../actor-rounds/application/ports/out/character-round.repository';
import { ActorRound } from '../../../../actor-rounds/domain/entities/actor-round.entity';
import * as gr from '../../../../games/application/ports/out/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import * as cc from '../../../../strategic/application/ports/out/character-client';
import { Character } from '../../../../strategic/application/ports/out/character-client';
import * as sgc from '../../../../strategic/application/ports/out/strategic-game-client';
import { StrategicGame } from '../../../../strategic/application/ports/out/strategic-game-client';
import { ActionMovement, ActionMovementModifiers } from '../../../domain/entities/action-movement.entity';
import { Action } from '../../../domain/entities/action.entity';
import { FatigueProcessorService } from '../../../domain/services/fatigue-processor.service';
import { MovementProcessorService } from '../../../domain/services/movement-processor.service';
import * as aep from '../../ports/out/action-event-producer';
import * as ar from '../../ports/out/action.repository';
import * as ac from '../../ports/out/attack-client';
import { ResolveMovementCommand } from '../resolve-movement.command';

@CommandHandler(ResolveMovementCommand)
export class ResolveMovementCommandHandler implements ICommandHandler<ResolveMovementCommand, Action> {
  constructor(
    @Inject() private readonly movementProcessorService: MovementProcessorService,
    @Inject() private readonly fatigueProcessorService: FatigueProcessorService,
    @Inject('GameRepository') private readonly gameRepository: gr.GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: crr.ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ar.ActionRepository,
    @Inject('CharacterClient') private readonly characterClient: cc.CharacterClient,
    @Inject('StrategicGameClient') private readonly strategicGameClient: sgc.StrategicGameClient,
    @Inject('AttackClient') private readonly attackClient: ac.AttackClient,
    @Inject('ActionEventProducer') private readonly actionEventProducer: aep.ActionEventProducer,
  ) {}

  async execute(command: ResolveMovementCommand): Promise<Action> {
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

    this.processAction(command, action, character, actorRound, strategicGame);
    const updated = await this.actionRepository.update(action.id, action);
    if (action.fatigue) {
      const currentFatigue = actorRound.fatigue || 0;
      actorRound.fatigue = currentFatigue + action.fatigue;
      await this.actorRoundRepository.update(actorRound.id, actorRound);
    }
    await this.actionEventProducer.updated(updated);
    return updated;
  }

  private processAction(
    command: ResolveMovementCommand,
    action: Action,
    character: Character,
    actorRound: ActorRound,
    strategicGame: StrategicGame,
  ): void {
    action.description = command.description;
    action.phaseEnd = command.phase;
    action.actionPoints = action.phaseEnd - action.phaseStart + 1;
    action.movement = this.buildActionMovement(command);
    this.movementProcessorService.process(command.roll, action, character, actorRound);
    this.fatigueProcessorService.process(action, strategicGame);
    const scale = strategicGame.options?.boardScaleMultiplier || 1;
    action.movement.calculated.distanceAdjusted = action.movement.calculated.distance * scale;
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
      pace: command.pace,
      requiredManeuver: command.requiredManeuver === true,
      skillId: command.skillId,
      difficulty: command.difficulty,
      customBonus: command.customBonus,
    };
  }

  private validate(command: ResolveMovementCommand, action: Action): void {
    if (action.actionType !== 'movement') {
      throw new ValidationError('Action is not a movement action');
    } else if (action.status === 'completed') {
      throw new ValidationError('Action is already completed');
    }
    if (command.requiredManeuver === true) {
      if (!command.roll) {
        throw new ValidationError('Roll is required for a maneuver');
      }
      if (!command.difficulty) {
        throw new ValidationError('Difficulty is required for a maneuver');
      }
      if (!command.skillId) {
        throw new ValidationError('SkillId is required for a maneuver');
      }
    }
  }
}
