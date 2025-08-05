import { DomainEvent } from '../../events/domain-event';

export interface EventNotificationPort<I> {
  notify(event: DomainEvent<I>): Promise<void>;
}
