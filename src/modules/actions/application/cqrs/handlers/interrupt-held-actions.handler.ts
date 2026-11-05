import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { Game } from '../../../../games/domain/aggregates/game.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';
import { Action } from '../../../domain/aggregates/action.js';
import { ActionUpdatedEvent } from '../../../domain/events/action.events.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { InterruptHeldActionsCommand } from '../commands/interrupt-held-actions.command.js';

/** Last action phase, the one used outside the action phases. */
const LAST_PHASE = 4;

/**
 * Workspace spec 077, decision A2.4: the held actions of an actor whose concentration broke are interrupted, with the AP
 * they spent. Actions no longer held are left as they are.
 */
@CommandHandler(InterruptHeldActionsCommand)
export class InterruptHeldActionsHandler implements ICommandHandler<InterruptHeldActionsCommand, Action[]> {
  private readonly logger = new Logger(InterruptHeldActionsHandler.name);

  constructor(
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(command: InterruptHeldActionsCommand): Promise<Action[]> {
    const interrupted: Action[] = [];
    if (command.actionIds.length === 0) {
      return interrupted;
    }
    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    const game = actorRound ? await this.gameRepository.findById(actorRound.gameId) : null;
    const phase = (game && Game.toActionPhase(game.phase)) ?? LAST_PHASE;
    for (const actionId of command.actionIds) {
      const action = await this.actionRepository.findById(actionId);
      if (!action || action.status !== 'held') {
        continue;
      }
      action.close(actorRound, phase, 'interrupted');
      const updated = await this.actionRepository.update(action);
      await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
      this.logger.log(`Held action ${action.id} of ${action.actorId} interrupted: its concentration broke`);
      interrupted.push(updated);
    }
    return interrupted;
  }
}
