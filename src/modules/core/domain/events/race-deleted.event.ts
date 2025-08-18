import { Race } from '../entities/race';
import { DomainEvent } from './domain-event';

export class RaceDeletedEvent extends DomainEvent<Race> {
  constructor(data: Race) {
    super('RaceDeletedEvent', data);
  }
}
