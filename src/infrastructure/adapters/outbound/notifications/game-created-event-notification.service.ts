import { injectable } from 'inversify';

import { Game } from '@domain/entities/game.entity';
import { GameCreatedEvent } from '@domain/events/game-created.event';
import { TopicConfiguration } from '@application/ports/outbound/event-notification-service';

import { config } from '@infrastructure/config/config';
import { AbstractKafkaEventNotificationService } from './abstract-kafka-event-notification.service';

@injectable()
export class GameCreatedEventNotificationService extends AbstractKafkaEventNotificationService<GameCreatedEvent, Game> {
  getTopicConfiguration(): TopicConfiguration {
    return {
      topicName: 'internal.rmu-tactical.game.created.v1',
      partitionCount: config.kafka.partitionCount,
      replicationFactor: config.kafka.replicationFactor,
      retentionMs: config.kafka.retentionMs,
      compressionType: config.kafka.compressionType,
    };
  }

  getServiceName(): string {
    return 'Game Created Event Notification Service';
  }
}
