import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { Action } from '../../domain/aggregates/action.aggregate';

export interface ActionEventBusPort {
  publish(event: DomainEvent<Action>): Promise<void>;
}
