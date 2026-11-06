import type { ActorRoundRepository } from '../../../actor-rounds/application/ports/actor-round-repository.port.js';
import type { DomainEventPublisher } from '../../../shared/application/ports/domain-event-publisher.port.js';
import type { Action } from '../../domain/aggregates/action.js';
import { ActionUpdatedEvent } from '../../domain/events/action.events.js';
import type { ActionWarning } from '../../domain/value-objects/action-medical.vo.js';
import type { ActionRepository } from '../ports/action-repository.port.js';

const MAX_PAGE_SIZE = 1000;

/**
 * Workspace spec 083, ADR 0013: what changes in the other actions of the round when the OB an actor has committed
 * changes, and giving back what an action reserved.
 */
export class RoundBoCommitments {
  constructor(
    private readonly actionRepository: ActionRepository,
    private readonly actorRoundRepository: ActorRoundRepository,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  /** Gives back what these actions reserved on any actor of the round: they were deleted or prepared again. */
  async release(gameId: string, round: number, actionIds: string[]): Promise<void> {
    if (actionIds.length === 0) {
      return;
    }
    const actorRounds = (await this.actorRoundRepository.findByRsql(`gameId==${gameId};round==${round}`, 0, MAX_PAGE_SIZE)).content;
    const released = new Set<string>();
    for (const actorRound of actorRounds) {
      if (actionIds.map(actionId => actorRound.releaseBoReservations(actionId)).some(Boolean)) {
        await this.actorRoundRepository.update(actorRound);
        released.add(actorRound.actorId);
      }
    }
    await this.refresh(gameId, round, released, actionIds);
  }

  /**
   * The OB of these actors changed. Their attacks not rolled yet go down to what they have left, with a warning (spec
   * 082, decision 8), and the parries not declared yet in the other open actions show what they can give now.
   */
  async refresh(gameId: string, round: number, actorIds: Set<string>, exceptActionIds: string[] = []): Promise<ActionWarning[]> {
    if (actorIds.size === 0) {
      return [];
    }
    const rsql = `gameId==${gameId};round==${round}`;
    const [actorRounds, actions] = await Promise.all([
      this.actorRoundRepository.findByRsql(rsql, 0, MAX_PAGE_SIZE).then(page => page.content),
      this.actionRepository.findByRsql(rsql, 0, MAX_PAGE_SIZE).then(page => page.content),
    ]);
    const changedActors = actorRounds.filter(actorRound => actorIds.has(actorRound.actorId));
    const warnings: ActionWarning[] = [];
    for (const action of actions.filter(each => !exceptActionIds.includes(each.id))) {
      const actorRound = changedActors.find(each => each.actorId === action.actorId);
      const lowered = actorRound ? action.lowerAttacksBo(attackName => actorRound.getCurrentBo(attackName)) : [];
      const parries = changedActors.map(each => action.refreshOpenParries(each)).some(Boolean);
      if (lowered.length > 0 || parries) {
        await this.save(action);
      }
      lowered.forEach(({ attackName, from, to }) =>
        warnings.push({
          code: 'attack-ob-reduced',
          params: { actor: actorRound!.actorName, attackName, from, to },
          requiresConfirm: false,
        }),
      );
    }
    return warnings;
  }

  private async save(action: Action): Promise<void> {
    const updated = await this.actionRepository.update(action);
    await this.eventPublisher.publish('action', new ActionUpdatedEvent(updated));
  }
}
