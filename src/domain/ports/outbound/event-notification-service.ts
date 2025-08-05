import { DomainEvent } from '@domain/events/domain-event';

export interface EventNotificationService<T extends DomainEvent> {
  notify(event: T): Promise<void>;

  getTopicConfiguration(): TopicConfiguration;
}

export interface TopicConfiguration {
  topicName: string;
  partitionCount: number;
  replicationFactor?: number;
  retentionMs?: number;
  compressionType?: 'gzip' | 'snappy' | 'lz4' | 'zstd';
}
