import { DomainEvent } from '../../events/domain-event';

export interface EventNotificationPort {
  notify(event: DomainEvent): Promise<void>;
}
