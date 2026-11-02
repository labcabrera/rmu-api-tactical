import { DomainEvent } from '../../../shared/domain/events/domain-event.js';
import { ActorRound } from '../aggregates/actor-round.js';

export class ActorRoundCreatedEvent extends DomainEvent<ActorRound> {
  constructor(data: ActorRound) {
    super('actor-round-created', data);
  }
}
