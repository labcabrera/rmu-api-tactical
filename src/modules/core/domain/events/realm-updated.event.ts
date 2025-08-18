import { Realm } from '../entities/realm';
import { DomainEvent } from './domain-event';

export class RealmUpdatedEvent extends DomainEvent<Realm> {
  constructor(data: Realm) {
    super('RealmUpdatedEvent', data);
  }
}
