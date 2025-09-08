import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { KafkaProducerService } from '../../../shared/infrastructure/messaging/kafka-producer.service';
import { GameEventBusPort } from '../../application/ports/game-event-bus.port';
import { Game } from '../../domain/entities/game.aggregate';
import { GameCreatedEvent, GameDeletedEvent, GameUpdatedEvent } from '../../domain/events/game.events';

@Injectable()
export class KafkaGameEventBusAdapter implements GameEventBusPort {
  private readonly logger = new Logger(KafkaGameEventBusAdapter.name);

  constructor(private readonly kafkaProducerService: KafkaProducerService) {}

  publish(event: DomainEvent<Game>): void {
    this.kafkaProducerService.emit(`internal.rmu-tactical.game.${event.eventType}.v1`, event).catch((err) => {
      //TODO handle error properly
      this.logger.error('Error publishing event to Kafka', err);
    });
  }

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
