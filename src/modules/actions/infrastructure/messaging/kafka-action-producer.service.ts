import { Injectable } from '@nestjs/common';

import { KafkaProducerService } from '../../../shared/infrastructure/messaging/kafka-producer.service';
import { ActionEventProducer } from '../../application/ports/out/action-event-producer';
import { Action } from '../../domain/entities/action.aggregate';
import { ActionCreatedEvent, ActionDeletedEvent, ActionUpdatedEvent } from '../../domain/events/action-events';

@Injectable()
export class KafkaActionProducerService implements ActionEventProducer {
  constructor(private readonly kafkaProducerService: KafkaProducerService) {}

  async created(entity: Action): Promise<void> {
    const event = new ActionCreatedEvent(entity);
    await this.kafkaProducerService.emit('internal.rmu-tactical.action.created.v1', event);
  }
  async updated(entity: Action): Promise<void> {
    const event = new ActionUpdatedEvent(entity);
    await this.kafkaProducerService.emit('internal.rmu-tactical.action.updated.v1', event);
  }

  async deleted(entity: Action): Promise<void> {
    const event = new ActionDeletedEvent(entity);
    await this.kafkaProducerService.emit('internal.rmu-tactical.action.deleted.v1', event);
  }
}
