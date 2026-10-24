import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { ActorRound } from '../aggregates/actor-round';

export class ActorRoundCreatedEvent extends DomainEvent<ActorRound> {
  constructor(data: ActorRound) {
    super('actor-round-created', data);
  }
}
