import { inject, injectable } from 'inversify';
import { DomainEvent } from '../../../../domain/events/domain-event';
import { EventAdapter } from '../../../../domain/ports/inbound/event-adapter';
import { EventListener } from '../../../../domain/ports/inbound/event-listener';
import { Logger } from '../../../../domain/ports/logger';
import { TYPES } from '../../../../shared/types';

@injectable()
export class MockKafkaEventAdapter implements EventAdapter {

  private readonly listeners: Map<string, EventListener<any>> = new Map();
  private running = false;

  constructor(
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  registerEventListener<T extends DomainEvent>(listener: EventListener<T>): void {
    const topic = listener.getTopic();
    this.listeners.set(topic, listener);
    this.logger.info(`Registered event listener for topic: ${topic} and event type: ${listener.getEventType()}`);
  }

  async start(): Promise<void> {
    this.running = true;
    this.logger.info(`Mock Kafka Event Adapter started. Listening to ${this.listeners.size} topics.`);
    
    // Log registered topics
    for (const [topic, listener] of this.listeners.entries()) {
      this.logger.info(`- Topic: ${topic}, Event Type: ${listener.getEventType()}`);
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    this.logger.info('Mock Kafka Event Adapter stopped.');
  }

  isRunning(): boolean {
    return this.running;
  }

  /**
   * Simulates processing a Kafka message - useful for testing
   * @param topic The topic to simulate
   * @param message The message payload
   */
  async simulateMessage(topic: string, message: any): Promise<void> {
    const listener = this.listeners.get(topic);
    if (!listener) {
      this.logger.warn(`No listener registered for topic: ${topic}`);
      return;
    }

    try {
      this.logger.info(`Simulating message for topic: ${topic}`);
      
      // This is a simplified approach - in a real implementation,
      // you would deserialize the message properly based on the event type
      if (topic === 'internal.rmu-core.realm.deleted.v1') {
        const { RealmDeletedEventListener } = await import('./realm-deleted-event-listener');
        const event = RealmDeletedEventListener.createEventFromMessage(message);
        await listener.handle(event);
      }
      
    } catch (error) {
      this.logger.error(`Error processing simulated message for topic ${topic}:`, error);
      throw error;
    }
  }
}
