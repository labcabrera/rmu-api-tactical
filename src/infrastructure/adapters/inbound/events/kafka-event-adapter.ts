import { inject, injectable } from 'inversify';
import { Consumer, EachMessagePayload, Kafka } from 'kafkajs';

import { DomainEvent } from '@domain/events/domain-event';

import { EventAdapter } from '@application/ports/inbound/event-adapter';
import { EventListener } from '@application/ports/inbound/event-listener';
import { Logger } from '@application/ports/logger';
import { config } from '@infrastructure/config/config';
import { TYPES } from '@shared/types';

@injectable()
export class KafkaEventAdapter implements EventAdapter {
  private kafka: Kafka;
  private consumer: Consumer;
  private readonly listeners: Map<string, EventListener<any, any>> = new Map();
  private running = false;

  constructor(@inject(TYPES.Logger) private readonly logger: Logger) {
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      retry: {
        initialRetryTime: 1000,
        retries: 5,
        factor: 2,
        maxRetryTime: 30000,
        restartOnFailure: async e => {
          this.logger.error('Kafka restart on failure:', e);
          return true;
        },
      },
    });

    this.consumer = this.kafka.consumer({
      groupId: config.kafka.consumerGroupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxWaitTimeInMs: 5000,
      allowAutoTopicCreation: false,
    });
  }

  registerEventListener<T extends DomainEvent<I>, I>(listener: EventListener<T, I>): void {
    const topic = listener.getTopic();
    this.listeners.set(topic, listener);
    this.logger.info(`Registered event listener for topic: ${topic} and event type: ${listener.getEventType()}`);
  }

  async start(): Promise<void> {
    try {
      this.logger.info('Starting Kafka Event Adapter...');

      await this.consumer.connect();
      this.logger.info('Connected to Kafka');

      const topics = Array.from(this.listeners.keys());
      if (topics.length === 0) {
        this.logger.warn('No topics to subscribe to');
        return;
      }

      await this.consumer.subscribe({ topics });
      this.logger.info(`Subscribed to topics: ${topics.join(', ')}`);

      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          await this.handleMessage(payload);
        },
        eachBatch: undefined,
      });

      this.running = true;
      this.logger.info(`Kafka Event Adapter started successfully. Listening to ${topics.length} topics.`);

      // Log registered topics
      for (const [topic, listener] of this.listeners.entries()) {
        this.logger.info(`- Topic: ${topic}, Event Type: ${listener.getEventType()}`);
      }
    } catch (error) {
      this.logger.error('Failed to start Kafka Event Adapter:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping Kafka Event Adapter...');
      this.running = false;

      await this.consumer.disconnect();
      this.logger.info('Kafka Event Adapter stopped successfully');
    } catch (error) {
      this.logger.error('Error stopping Kafka Event Adapter:', error);
      throw error;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    try {
      if (!message.value) {
        this.logger.warn(`Received empty message from topic: ${topic}`);
        return;
      }

      const listener = this.listeners.get(topic);
      if (!listener) {
        this.logger.warn(`No listener registered for topic: ${topic}`);
        return;
      }

      const messageValue = message.value.toString();
      this.logger.debug(`Processing message from topic: ${topic}, partition: ${partition}, offset: ${message.offset}`);

      // Parse the message
      let messageData: any;
      try {
        messageData = JSON.parse(messageValue);
      } catch (parseError) {
        this.logger.error(`Failed to parse JSON message from topic ${topic}:`, parseError);
        return;
      }

      // Create domain event based on topic
      const event = await this.createDomainEvent(topic, messageData);
      if (!event) {
        this.logger.warn(`Could not create domain event for topic: ${topic}`);
        return;
      }

      // Handle the event
      await listener.handle(event);
      this.logger.debug(`Successfully processed message from topic: ${topic}`);
    } catch (error) {
      this.logger.error(`Error processing message from topic ${topic}:`, error);
      // In a production environment, you might want to send to a dead letter queue
      // or implement retry logic here
      throw error;
    }
  }

  private async createDomainEvent(topic: string, messageData: any): Promise<DomainEvent<any> | null> {
    try {
      switch (topic) {
        case 'internal.rmu-core.realm.deleted.v1':
          const { RealmDeletedEventListener } = await import('./realm-deleted-event-listener');
          return RealmDeletedEventListener.createEventFromMessage(messageData);

        // Add more cases for other topics as needed
        default:
          this.logger.warn(`Unknown topic for event creation: ${topic}`);
          return null;
      }
    } catch (error) {
      this.logger.error(`Error creating domain event for topic ${topic}:`, error);
      this.logger.error(`Data ${JSON.stringify(messageData)}`);
      return null;
    }
  }

  /**
   * Graceful shutdown handler
   */
  async shutdown(): Promise<void> {
    this.logger.info('Initiating graceful shutdown of Kafka Event Adapter...');

    try {
      await this.stop();
    } catch (error) {
      this.logger.error('Error during graceful shutdown:', error);
    }
  }
}
