import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { HerbUseService } from '../../../../actor-rounds/application/services/herb-use.service.js';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { Game } from '../../../../games/domain/aggregates/game.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { Action } from '../../../domain/aggregates/action.js';
import { ActionUpdatedEvent } from '../../../domain/events/action.events.js';
import type { ActionType } from '../../../domain/value-objects/action-type.vo.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { MedicalActionService } from '../../services/medical/medical-action.service.js';
import { ResolveMedicalCommand, ResolveUseItemCommand } from '../commands/medical-action.commands.js';

interface LoadedAction {
  action: Action;
  game: Game;
  actor: ActorRound;
  phase: number;
}

/** The action of the type, its game in an action phase of its round, and its actor's round. */
const load = async (
  actionId: string,
  actionType: ActionType,
  actions: ActionRepository,
  games: GameRepository,
  actorRounds: ActorRoundRepository,
): Promise<LoadedAction> => {
  const action = await actions.findById(actionId);
  if (!action) throw new NotFoundError('Action', actionId);
  if (action.actionType !== actionType) {
    throw new ValidationError(`Action ${actionId} is not a ${actionType} action`, 'err-action-invalid-type');
  }
  const game = await games.findById(action.gameId);
  if (!game) throw new NotFoundError('Game', action.gameId);
  const phase = game.getActionPhase();
  if (action.isClosed() || action.round !== game.round) {
    throw new ValidationError(`Action ${action.id} is already ${action.status}`, 'err-action-closed');
  }
  const actor = await actorRounds.findByActorIdAndRound(action.gameId, action.actorId, action.round);
  if (!actor) throw new NotFoundError('ActorRound', `${action.actorId} - ${action.round}`);
  return { action, game, actor, phase };
};

/**
 * Resolves the next round of 4 AP of a `medical` action (workspace spec 068, §2): the first rolls Medicine and starts
 * the treatment, the last applies it and closes the action as completed; `stabilize` rolls in each round. Until then
 * the action stays declared, takes the AP of each phase and goes on in the next round (spec 011, §5).
 */
@CommandHandler(ResolveMedicalCommand)
export class ResolveMedicalHandler implements ICommandHandler<ResolveMedicalCommand, Action> {
  private readonly logger = new Logger(ResolveMedicalHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
    private readonly medical: MedicalActionService,
  ) {}

  async execute(command: ResolveMedicalCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const { action, game, actor, phase } = await load(
      command.actionId,
      'medical',
      this.actionRepository,
      this.gameRepository,
      this.actorRoundRepository,
    );
    if (!action.medical) throw new ValidationError(`Action ${action.id} has no medical data`, 'err-medical-required');
    action.checkResolvable(actor, phase);
    const result = await this.medical.resolve(action, actor, game, phase, {
      roll: command.roll,
      unmodifiedRoll: command.unmodifiedRoll,
      heatHitsRoll: command.heatHitsRoll,
      heatCriticalRoll: command.heatCriticalRoll,
      herbalismRoll: command.herbalismRoll,
    });
    if (action.medical.state === 'completed') {
      action.close(actor, phase, 'completed');
    } else {
      action.updatedAt = new Date();
    }
    await this.actorRoundRepository.update(result.patient);
    if (result.patient !== actor && (result.healerChanged || action.status === 'completed')) {
      await this.actorRoundRepository.update(actor);
    }
    const updated = await this.actionRepository.update(action);
    await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
    updated.refreshApState(actor, phase);
    return updated;
  }
}

/**
 * Resolves a `use_item` action (workspace spec 068, decision 7): with its 2 AP, the healing item of the actor heals the
 * target as `POST herbs` does, and the actor records the unit consumed.
 */
@CommandHandler(ResolveUseItemCommand)
export class ResolveUseItemHandler implements ICommandHandler<ResolveUseItemCommand, Action> {
  private readonly logger = new Logger(ResolveUseItemHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
    private readonly herbs: HerbUseService,
  ) {}

  async execute(command: ResolveUseItemCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const { action, game, actor, phase } = await load(
      command.actionId,
      'use_item',
      this.actionRepository,
      this.gameRepository,
      this.actorRoundRepository,
    );
    const useItem = action.useItem;
    if (!useItem) throw new ValidationError(`Action ${action.id} has no item`, 'err-use-item-required');
    action.checkResolvable(actor, phase);
    const target =
      useItem.targetActorId === actor.actorId
        ? actor
        : await this.actorRoundRepository.findByActorIdAndRound(action.gameId, useItem.targetActorId, action.round);
    if (!target) throw new NotFoundError('Target actor', useItem.targetActorId, 'err-target-not-found');
    const use = await this.herbs.use(actor, target, useItem.itemId, command.roll ?? useItem.roll, game.getEffectPhase());
    useItem.result = {
      itemName: use.item.name,
      ...(use.roll !== undefined ? { roll: use.roll } : {}),
      healed: use.healed,
      stunRoundsRemoved: use.stunRoundsRemoved,
    };
    action.close(actor, phase, 'completed');
    if (target !== actor) {
      await this.actorRoundRepository.update(target);
    }
    await this.actorRoundRepository.update(actor);
    const updated = await this.actionRepository.update(action);
    await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
    updated.refreshApState(actor, phase);
    return updated;
  }
}
