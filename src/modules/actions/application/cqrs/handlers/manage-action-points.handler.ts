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
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { ManageActionPointsCommand } from '../commands/manage-action-points.command.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';

/**
 * AP of an open action in the current phase (spec 011): `spend-ap` spends one more AP of the phase on it, `hold`
 * holds it once it has its maximum AP, and `force` resolves it out of turn with a reason.
 */
@CommandHandler(ManageActionPointsCommand)
export class ManageActionPointsHandler implements ICommandHandler<ManageActionPointsCommand, Action> {
  private readonly logger = new Logger(ManageActionPointsHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
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
      await this.actorRoundRepository.update(actorRound);
    }
    const updated = await this.actionRepository.update(action);
    await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
    updated.refreshApState(actorRound, currentPhase);
    return updated;
  }
}
