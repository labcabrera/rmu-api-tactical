import { inject, injectable } from 'inversify';

import { DomainEvent } from '@domain/events/domain-event';
import { EventNotificationPort } from '@domain/ports/outbound/event-notification.port';
import { EventNotificationRegistry } from './event-notification-registry';

@injectable()
export class RegistryEventNotificationAdapter<I> implements EventNotificationPort<I> {
  constructor(@inject('EventNotificationRegistry') private registry: EventNotificationRegistry) {}

  async notify(event: DomainEvent<I>): Promise<void> {
    await this.registry.notify(event);
  }
}
