/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit {
  private readonly logger = new Logger(KafkaProducerService.name);

  private kafka: Kafka;
  private producer: Producer;
  private defaultPartitions: number = 1;

  constructor(private readonly configService: ConfigService) {
    const brokers = this.configService
      .get<string>('RMU_KAFKA_BROKERS')!
      .split(',')
      .map((broker) => broker.trim());
    const clientId = this.configService.get<string>('RMU_KAFKA_CLIENT_ID')!;
    this.kafka = new Kafka({
      clientId,
      brokers,
    });
    this.logger.debug(`Created Kafka with brokers: ${JSON.stringify(brokers)} and clientId: ${clientId} `);
    this.defaultPartitions = this.configService.get<number>('RMU_KAFKA_DEFAULT_PARTITIONS', 1);
  }

  async onModuleInit() {
    this.logger.debug('Connecting Kafka producer...');
    this.producer = this.kafka.producer();
    await this.producer.connect();
    this.logger.debug('Kafka producer connected.');
  }

  async emit(topic: string, message: any) {
    this.logger.debug(`Kafka >> ${topic}, id: ${message.data.id}`);
    const id = message.data.id ? message.data.id : '';
    await this.producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify(message),
          partition: this.getPartition(id),
        },
      ],
    });
  }

  private getPartition(key: string): number {
    // Simple hash-based partitioning
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % this.defaultPartitions;
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }
}
