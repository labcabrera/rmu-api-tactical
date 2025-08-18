import { Injectable } from '@nestjs/common';
import { Realm } from '../../domain/entities/realm';
import { RealmCreatedEvent } from '../../domain/events/realm-created.event';
import { RealmDeletedEvent } from '../../domain/events/realm-deleted.event';
import { RealmUpdatedEvent } from '../../domain/events/realm-updated.event';
import { KafkaProducerService } from './kafka-producer.service';

@Injectable()
export class KafkaRaceProducerService {
  constructor(private readonly kafkaProducerService: KafkaProducerService) {}

  async created(entity: Realm): Promise<void> {
    const event = new RealmCreatedEvent(entity);
    await this.kafkaProducerService.emit('internal.rmu-core.realm.created.v1', event);
  }
  async updated(entity: Realm): Promise<void> {
    const event = new RealmUpdatedEvent(entity);
    await this.kafkaProducerService.emit('internal.rmu-core.realm.updated.v1', event);
  }

  async deleted(entity: Realm): Promise<void> {
    const event = new RealmDeletedEvent(entity);
    await this.kafkaProducerService.emit('internal.rmu-core.realm.deleted.v1', event);
  }
}
