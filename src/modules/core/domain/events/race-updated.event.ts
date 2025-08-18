import { Race } from '../entities/race';
import { DomainEvent } from './domain-event';

export class RaceUpdatedEvent extends DomainEvent<Race> {
  constructor(data: Race) {
    super('RaceUpdatedEvent', data);
  }
}
