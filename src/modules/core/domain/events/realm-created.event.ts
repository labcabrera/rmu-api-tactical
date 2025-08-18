import { Realm } from '../entities/realm';
import { DomainEvent } from './domain-event';

export class RealmCreatedEvent extends DomainEvent<Realm> {
  constructor(data: Realm) {
    super('RealmCreatedEvent', data);
  }
}
