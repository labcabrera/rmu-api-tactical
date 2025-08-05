import { DomainEvent } from '../../events/domain-event';

export interface EventListener<T extends DomainEvent<I>, I> {
  handle(event: T): Promise<void>;

  getEventType(): string;

  getTopic(): string;
}
