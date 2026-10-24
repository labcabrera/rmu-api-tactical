import { Injectable, Logger } from '@nestjs/common';
import type { DomainEventPublisher } from '../../application/ports/domain-event-publisher.port';
import type { DomainEvent } from '../../domain/events/domain-event';
import { KafkaProducerService } from './kafka-producer.service';

/**
 * Topics that do not follow `internal.rmu-tactical.<aggregateType>.<eventType>.v1`. Every action event (created,
 * updated and deleted, with eventType `ActionCreatedEvent`...) has always gone to the one topic below, and spec 020
 * keeps the topics as they are [F-tactical-07].
 */
const FIXED_TOPICS: Record<string, string> = {
  action: 'internal.rmu-tactical.action.created.v1',
};

@Injectable()
export class KafkaDomainEventPublisher implements DomainEventPublisher {
  private readonly logger = new Logger(KafkaDomainEventPublisher.name);

  constructor(private readonly kafkaProducerService: KafkaProducerService) {}

  async publish(aggregateType: string, ...events: DomainEvent<unknown>[]): Promise<void> {
    // One at a time, so consumers see the events in the order they happened.
    for (const event of events) {
      const topic = FIXED_TOPICS[aggregateType] ?? `internal.rmu-tactical.${aggregateType}.${event.eventType}.v1`;
      try {
        await this.kafkaProducerService.emit(topic, event);
      } catch (error) {
        const id = (event.data as { id?: string } | undefined)?.id;
        this.logger.error(`Lost ${topic} for ${aggregateType} ${id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}
