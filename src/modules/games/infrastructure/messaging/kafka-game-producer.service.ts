import { Injectable } from '@nestjs/common';
import { KafkaProducerService } from '../../../shared/infrastructure/messaging/kafka-producer.service';
import { GameEventBusPort } from '../../application/ports/out/game-event-bus.port';
import { Game } from '../../domain/entities/game.entity';
import { GameCreatedEvent, GameDeletedEvent, GameUpdatedEvent } from '../../domain/events/game-events';

@Injectable()
export class KafkaGameProducerService implements GameEventBusPort {
  constructor(private readonly kafkaProducerService: KafkaProducerService) {}

  async created(entity: Game): Promise<void> {
    const event = new GameCreatedEvent(entity);
    await this.kafkaProducerService.emit('internal.rmu-tactical.game.created.v1', event);
  }
  async updated(entity: Game): Promise<void> {
    const event = new GameUpdatedEvent(entity);
    await this.kafkaProducerService.emit('internal.rmu-tactical.game.updated.v1', event);
  }

  async deleted(entity: Game): Promise<void> {
    const event = new GameDeletedEvent(entity);
    await this.kafkaProducerService.emit('internal.rmu-tactical.game.deleted.v1', event);
  }
}
