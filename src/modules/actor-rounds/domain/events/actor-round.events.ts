import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { ActorRound } from '../entities/actor-round.aggregate';

export class ActorRoundCreatedEvent extends DomainEvent<ActorRound> {
  constructor(data: ActorRound) {
    super('actor-round-created', data);
  }
}
