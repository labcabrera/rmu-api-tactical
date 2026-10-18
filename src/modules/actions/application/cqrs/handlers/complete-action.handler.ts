import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteEffectCommand } from '../../../../actor-rounds/application/cqrs/commands/delete-effect.command';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/actor-round.repository';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import { SIMPLE_ACTION_TYPES } from '../../../domain/value-objects/action-type.vo';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import { CompleteActionCommand } from '../commands/complete-action.command';

/**
 * Completes an action that has no rolls (stand up, dodge, draw and load, other): it ends in the current phase and
 * spends one action point per phase unless it is free. Standing up also clears the actor's prone effects. Other
 * effects (a dodge bonus...) are not applied automatically: the game master sets them as attack modifiers.
 */
@CommandHandler(CompleteActionCommand)
export class CompleteActionHandler implements ICommandHandler<CompleteActionCommand, Action> {
  private readonly logger = new Logger(CompleteActionHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
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

    if (action.actionType === 'stand_up') await this.clearProne(action, command);

    action.phaseEnd = Math.max(action.phaseStart, currentPhase);
    action.actionPoints = action.freeAction ? 0 : action.phaseEnd - action.phaseStart + 1;
    if (command.note !== undefined) action.description = command.note;
    action.status = 'completed';
    action.updatedAt = new Date();

    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return updated;
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
