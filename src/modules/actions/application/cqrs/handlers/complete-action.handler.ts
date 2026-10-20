import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteEffectCommand } from '../../../../actor-rounds/application/cqrs/commands/delete-effect.command';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/actor-round.repository';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import type { CharacterPort } from '../../../../strategic/application/ports/character.port';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import { SIMPLE_ACTION_TYPES } from '../../../domain/value-objects/action-type.vo';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import { CompleteActionCommand } from '../commands/complete-action.command';

/** Full dodge or block: the whole round (§9.6). */
const FULL_DEFENSE_ACTION_POINTS = 4;
/** Standing up (Table 8-1, §9.8 Prone): 2 AP, or 1 with Acrobatics ranks. */
const STAND_UP_ACTION_POINTS = 2;
const STAND_UP_ACROBATICS_ACTION_POINTS = 1;

/**
 * Completes an action that has no rolls (stand up, dodge, draw and load, other): it ends in the current phase and
 * spends one action point per phase unless it is free. Standing up checks its cost and clears the actor's prone
 * effects. A dodge is the 4 AP full dodge or full block of the round (§9.6): it takes the four phases whenever it is
 * completed, and sets the actor's defence mode.
 */
@CommandHandler(CompleteActionCommand)
export class CompleteActionHandler implements ICommandHandler<CompleteActionCommand, Action> {
  private readonly logger = new Logger(CompleteActionHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
    @Inject('CharacterClient') private readonly characterClient: CharacterPort,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: CompleteActionCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);
    if (!SIMPLE_ACTION_TYPES.includes(action.actionType)) {
      throw new ValidationError(`Action type ${action.actionType} cannot be completed without resolution`);
    }
    if (action.status === 'completed') throw new ValidationError('Action is already completed');

    const game = await this.gameRepository.findById(action.gameId);
    if (!game) throw new NotFoundError('Game', action.gameId);
    const currentPhase = game.getActionPhase();

    if (action.actionType === 'dodge') {
      await this.setFullDefense(action, command);
    } else if (command.defenseType) {
      throw new ValidationError('A defence type is only declared for dodge actions');
    } else {
      action.phaseEnd = Math.max(action.phaseStart, currentPhase);
      action.actionPoints = action.freeAction ? 0 : action.phaseEnd - action.phaseStart + 1;
    }
    if (action.actionType === 'stand_up') {
      await this.checkStandUpCost(action);
      await this.clearProne(action, command);
    }

    if (command.note !== undefined) action.description = command.note;
    action.status = 'completed';
    action.updatedAt = new Date();

    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return updated;
  }

  private async checkStandUpCost(action: Action): Promise<void> {
    const character = await this.characterClient.findById(action.actorId);
    const acrobatics = character?.skills?.find(skill => skill.skillId === 'acrobatics')?.ranks || 0;
    const required = acrobatics > 0 ? STAND_UP_ACROBATICS_ACTION_POINTS : STAND_UP_ACTION_POINTS;
    if ((action.actionPoints || 0) < required) {
      throw new ValidationError(`Standing up takes ${required} action points`, 'err-stand-up-action-points');
    }
  }

  private async setFullDefense(action: Action, command: CompleteActionCommand): Promise<void> {
    if (action.freeAction || action.phaseStart + FULL_DEFENSE_ACTION_POINTS - 1 > FULL_DEFENSE_ACTION_POINTS) {
      throw new ValidationError('A full dodge or block takes the 4 action points of the round', 'err-full-defense-action-points');
    }
    const actorRound = await this.actorRoundRepository.findByActorIdAndRound(action.gameId, action.actorId, action.round);
    if (!actorRound) throw new NotFoundError('ActorRound', `${action.actorId} - ${action.round}`);
    actorRound.setFullDefense(command.defenseType ?? 'dodge');
    await this.actorRoundRepository.update(actorRound.id, actorRound);
    action.phaseEnd = action.phaseStart + FULL_DEFENSE_ACTION_POINTS - 1;
    action.actionPoints = FULL_DEFENSE_ACTION_POINTS;
  }

  private async clearProne(action: Action, command: CompleteActionCommand): Promise<void> {
    const actorRound = await this.actorRoundRepository.findByActorIdAndRound(action.gameId, action.actorId, action.round);
    if (!actorRound) throw new NotFoundError('ActorRound', `${action.actorId} - ${action.round}`);
    const prone = actorRound.effects.filter(effect => effect.status === 'prone');
    for (const effect of prone) {
      await this.commandBus.execute(new DeleteEffectCommand(actorRound.id, effect.id, command.userId, command.roles));
    }
  }
}
