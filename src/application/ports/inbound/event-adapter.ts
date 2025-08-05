import { DomainEvent } from '@domain/events/domain-event';
import { EventListener } from './event-listener';

export interface EventAdapter {
  /**
   * Registers an event listener for a specific topic
   * @param listener The event listener to register
   */
  registerEventListener<T extends DomainEvent<I>, I>(listener: EventListener<T, I>): void;

  /**
   * Starts listening to Kafka topics
   */
  start(): Promise<void>;

  /**
   * Stops listening to Kafka topics
   */
  stop(): Promise<void>;

  /**
   * Returns the status of the adapter
   */
  isRunning(): boolean;
}
