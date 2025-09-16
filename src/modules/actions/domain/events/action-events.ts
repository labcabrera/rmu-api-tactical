import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { Action } from '../aggregates/action.aggregate';

export class ActionCreatedEvent extends DomainEvent<Action> {
  constructor(data: Action) {
    super('ActionCreatedEvent', data);
  }
}

export class ActionUpdatedEvent extends DomainEvent<Action> {
  constructor(data: Action) {
    super('ActionUpdatedEvent', data);
  }
}

export class ActionDeletedEvent extends DomainEvent<Action> {
  constructor(data: Action) {
    super('ActionDeletedEvent', data);
  }
}
