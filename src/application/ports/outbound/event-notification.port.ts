import { DomainEvent } from '@domain/events/domain-event';

export interface EventNotificationPort<I> {
  notify(event: DomainEvent<I>): Promise<void>;
}
