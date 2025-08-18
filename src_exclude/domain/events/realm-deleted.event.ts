import { DomainEvent } from './domain-event';

export interface Realm {
  id: string;
  name: string;
}

export class RealmDeletedEvent extends DomainEvent<Realm> {
  constructor(readonly realm: Realm) {
    super('RealmDeletedEvent', realm);
  }
}
