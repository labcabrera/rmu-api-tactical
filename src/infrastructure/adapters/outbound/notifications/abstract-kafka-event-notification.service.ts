import { injectable } from 'inversify';
import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { DomainEvent } from '@domain/events/domain-event';
import {
  EventNotificationService,
  TopicConfiguration,
} from '@domain/ports/outbound/event-notification-service';
import { config } from '@infrastructure/config/config';
import { container } from '@shared/container';
import { Logger } from '@domain/ports/logger';

@injectable()
export abstract class AbstractKafkaEventNotificationService<T extends DomainEvent>
  implements EventNotificationService<T>
{
  protected readonly kafka: Kafka;
  protected readonly logger: Logger;
  protected producer: Producer | null = null;
  protected isInitialized = false;

  constructor() {
    this.logger = container.get('Logger');
    this.kafka = new Kafka({
      clientId: this.getClientId(),
      brokers: config.kafka.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 3,
      },
    });
  }

  abstract getTopicConfiguration(): TopicConfiguration;
  abstract getServiceName(): string;

  protected getClientId(): string {
    return `rmu-api-core-${this.getServiceName().toLowerCase().replace(/\s+/g, '-')}`;
  }

  protected async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.debug(`Initializing ${this.getServiceName()} producer...`);
      this.producer = this.kafka.producer({
        maxInFlightRequests: 1,
        idempotent: true,
        transactionTimeout: 30000,
      });

      await this.producer.connect();
      this.logger.info(`${this.getServiceName()} producer connected successfully`);
      this.isInitialized = true;
    } catch (error) {
      this.logger.error(`Failed to initialize ${this.getServiceName()} producer:`, error);
      throw error;
    }
  }

  async notify(event: T): Promise<void> {
    try {
      await this.initialize();

      if (!this.producer) {
        throw new Error(`${this.getServiceName()} producer not initialized`);
      }

      this.logger.debug(`Notifying event: ${event.eventType} for aggregate ${event.aggregateId}`);

      const topicConfig = this.getTopicConfiguration();

      this.logger.debug(`Topic config: ${JSON.stringify(topicConfig)}`);

      const message = this.createMessage(event);
      const partition = this.getPartition(event.aggregateId, topicConfig.partitionCount);

      const producerRecord: ProducerRecord = {
        topic: topicConfig.topicName,
        messages: [
          {
            partition: partition,
            key: event.aggregateId,
            value: JSON.stringify(message),
            timestamp: event.occurredOn.getTime().toString(),
            headers: {
              eventType: event.eventType,
              eventVersion: event.eventVersion.toString(),
              contentType: 'application/json',
              service: this.getServiceName(),
            },
          },
        ],
      };

      this.logger.debug(
        `${this.getServiceName()} sending event to topic "${topicConfig.topicName}"`
      );
      const result = await this.producer.send(producerRecord);

      this.logger.debug(`${this.getServiceName()} event sent successfully:`, {
        topic: topicConfig.topicName,
        partition: result[0].partition,
        offset: result[0].offset,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
      });
    } catch (error) {
      this.logger.error(`${this.getServiceName()} failed to send event:`, error);
      throw error;
    }
  }

  protected getPartition(aggregateId: string, partitionCount: number): number {
    let hash = 0;
    for (let i = 0; i < aggregateId.length; i++) {
      const char = aggregateId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % partitionCount;
  }

  protected createMessage(event: T): object {
    return {
      id: `${event.aggregateId}-${event.occurredOn.getTime()}`,
      timestamp: event.occurredOn.toISOString(),
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      version: event.eventVersion,
      data: event.toJSON(),
      metadata: {
        source: 'rmu-api-core',
        service: this.getServiceName(),
        correlationId: this.generateCorrelationId(),
        causationId: event.aggregateId,
      },
    };
  }

  protected generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async disconnect(): Promise<void> {
    if (this.producer) {
      try {
        this.logger.debug(`Disconnecting ${this.getServiceName()} producer...`);
        await this.producer.disconnect();
        this.logger.info(`${this.getServiceName()} producer disconnected`);
        this.isInitialized = false;
        this.producer = null;
      } catch (error) {
        this.logger.error(`Error disconnecting ${this.getServiceName()} producer:`, error);
        throw error;
      }
    }
  }
}
