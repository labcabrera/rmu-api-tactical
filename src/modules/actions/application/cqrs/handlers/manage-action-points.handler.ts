import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/actor-round.repository';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import { ManageActionPointsCommand } from '../commands/manage-action-points.command';

/**
 * AP of an open action in the current phase (spec 011): `spend-ap` spends one more AP of the phase on it, `hold`
 * holds it once it has its maximum AP, and `force` resolves it out of turn with a reason.
 */
@CommandHandler(ManageActionPointsCommand)
export class ManageActionPointsHandler implements ICommandHandler<ManageActionPointsCommand, Action> {
  private readonly logger = new Logger(ManageActionPointsHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
  ) {}

  async execute(command: ManageActionPointsCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);
    const game = await this.gameRepository.findById(action.gameId);
    if (!game) throw new NotFoundError('Game', action.gameId);
    if (action.round !== game.round) {
      throw new ValidationError(`Action ${action.id} is not of the current round`, 'err-action-not-open');
    }
    const currentPhase = game.getActionPhase();
    const actorRound = await this.actorRoundRepository.findByActorIdAndRound(action.gameId, action.actorId, action.round);
    if (!actorRound) throw new NotFoundError('ActorRound', `${action.actorId} - ${action.round}`);
    const ledgerSize = actorRound.apLedger.length;

    switch (command.operation) {
      case 'spend-ap':
        action.spendExtraAp(actorRound, currentPhase);
        break;
      case 'hold':
        action.hold(actorRound, currentPhase);
        break;
      case 'force':
        if (!command.reason) throw new ValidationError('A forced action needs a reason', 'err-action-force-invalid-reason');
        action.force(actorRound, currentPhase, command.reason, command.note);
        this.logger.log(`Action ${action.id} forced: ${command.reason} ${command.note ?? ''}`);
        break;
    }

    if (actorRound.apLedger.length !== ledgerSize) {
      await this.actorRoundRepository.update(actorRound.id, actorRound);
    }
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    updated.refreshApState(actorRound, currentPhase);
    return updated;
  }
}
