import { inject, injectable } from 'inversify';

import { DomainEvent } from '@domain/events/domain-event';
import { Logger } from '@application/ports/logger';
import { EventNotificationService } from '@application/ports/outbound/event-notification-service';

@injectable()
export class EventNotificationRegistry {
  private services: Map<string, EventNotificationService<any, any>> = new Map();

  constructor(@inject('Logger') private readonly logger: Logger) {}

  registerService<T extends DomainEvent<I>, I>(eventType: string, service: EventNotificationService<T, I>): void {
    if (this.services.has(eventType)) {
      this.logger.warn(`Overriding existing service for event type: ${eventType}`);
    }
    this.services.set(eventType, service);
    this.logger.info(`Registered notification service for event type: ${eventType}`);
  }

  async notify<I>(event: DomainEvent<I>): Promise<void> {
    const service = this.services.get(event.eventType);

    if (!service) {
      this.logger.warn(`No notification service found for event type: ${event.eventType}`);
      return;
    }

    try {
      await service.notify(event);
    } catch (error) {
      this.logger.error(`Failed to notify event ${event.eventType}:`, error);
      throw error;
    }
  }

  getRegisteredServices(): Map<string, EventNotificationService<any, any>> {
    return new Map(this.services);
  }
}
