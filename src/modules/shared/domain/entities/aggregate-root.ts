/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { DomainEvent } from '../events/domain-event';

// Consider use nestjs/cqrs package AggregateRoot
export abstract class AggregateRoot<T> {
  private domainEvents: DomainEvent<T>[] = [];

  addDomainEvent(event: DomainEvent<T>) {
    this.domainEvents.push(event);
  }

  pullDomainEvents(): DomainEvent<T>[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }

  /**
   * Convert the aggregate to a plain object suitable for persistence,
   * excluding domain events.
   */
  toPersistence(): any {
    const { domainEvents, ...rest } = this as any;
    return { ...rest };
  }
}
