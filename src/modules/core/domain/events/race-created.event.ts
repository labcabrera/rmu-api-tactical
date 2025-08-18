import { Race } from '../entities/race';
import { DomainEvent } from './domain-event';

export class RaceCreatedEvent extends DomainEvent<Race> {
  constructor(data: Race) {
    super('RaceCreatedEvent', data);
  }
}
