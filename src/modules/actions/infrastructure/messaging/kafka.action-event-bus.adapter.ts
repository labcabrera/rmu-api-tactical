import { Injectable } from '@nestjs/common';
import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { KafkaProducerService } from '../../../shared/infrastructure/messaging/kafka-producer.service';
import { ActionEventBusPort } from '../../application/ports/action-event-bus.port';
import { Action } from '../../domain/entities/action.aggregate';

@Injectable()
export class KafkaActionEventBusAdapter implements ActionEventBusPort {
  constructor(private readonly kafkaProducerService: KafkaProducerService) {}

  async publish(event: DomainEvent<Action>): Promise<void> {
    await this.kafkaProducerService.emit('internal.rmu-tactical.action.created.v1', event);
  }
}
