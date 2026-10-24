import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TerminusModule } from '@nestjs/terminus';

import { AuthModule } from './infrastructure/security/auth.module.js';
import { RsqlParser } from './infrastructure/db/rsql-parser.js';
import { HttpClient } from './infrastructure/http/http-client.js';
import { DOMAIN_EVENT_PUBLISHER } from './application/ports/domain-event-publisher.port.js';
import { KafkaDomainEventPublisher } from './infrastructure/messaging/kafka.domain-event.publisher.js';
import { KafkaProducerService } from './infrastructure/messaging/kafka-producer.service.js';
import { HealthController } from './interfaces/http/health.controller.js';

@Module({
  imports: [TerminusModule, CqrsModule, ConfigModule, AuthModule],
  controllers: [HealthController],
  providers: [RsqlParser, HttpClient, KafkaProducerService, { provide: DOMAIN_EVENT_PUBLISHER, useClass: KafkaDomainEventPublisher }],
  exports: [RsqlParser, HttpClient, KafkaProducerService, DOMAIN_EVENT_PUBLISHER],
})
export class SharedModule {}
