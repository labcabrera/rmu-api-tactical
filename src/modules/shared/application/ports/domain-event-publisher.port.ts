import type { DomainEvent } from '../../domain/events/domain-event.js';

export const DOMAIN_EVENT_PUBLISHER = Symbol('DomainEventPublisher');

/**
 * Publishes domain events to `internal.rmu-tactical.<aggregateType>.<eventType>.v1` (see KafkaDomainEventPublisher
 * for the action topic). Publishing happens after the change is saved, so a failure is logged and never thrown: the
 * caller's request still succeeds.
 */
export interface DomainEventPublisher {
  publish(aggregateType: string, ...events: DomainEvent<unknown>[]): Promise<void>;
}
