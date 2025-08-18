import { DomainEvent } from './domain-event';
import { Realm } from '../entities/realm';

export class RealmDeletedEvent extends DomainEvent<Realm> {
  constructor(data: Realm) {
    super('RealmDeletedEvent', data);
  }
}
