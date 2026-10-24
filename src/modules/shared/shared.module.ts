import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { CqrsModule } from '@nestjs/cqrs';
import { TerminusModule } from '@nestjs/terminus';

import { AuthModule } from './infrastructure/security/auth.module.js';
import { RsqlParser } from './infrastructure/db/rsql-parser.js';
import { HttpClient } from './infrastructure/http/http-client.js';
import { HttpThrottlerGuard } from './infrastructure/http/http-throttler.guard.js';
import { DOMAIN_EVENT_PUBLISHER } from './application/ports/domain-event-publisher.port.js';
import { KafkaDomainEventPublisher } from './infrastructure/messaging/kafka.domain-event.publisher.js';
import { KafkaProducerService } from './infrastructure/messaging/kafka-producer.service.js';
import { HealthController } from './interfaces/http/health.controller.js';

@Module({
  imports: [
    TerminusModule,
    CqrsModule,
    ConfigModule,
    AuthModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const limit = config.get<number>('RMU_THROTTLE_LIMIT')!;
        // Requests per client IP and window; 0 turns the limit off.
        return { throttlers: [{ limit, ttl: config.get<number>('RMU_THROTTLE_TTL_MS')! }], skipIf: () => limit === 0 };
      },
    }),
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: HttpThrottlerGuard },
    RsqlParser,
    HttpClient,
    KafkaProducerService,
    { provide: DOMAIN_EVENT_PUBLISHER, useClass: KafkaDomainEventPublisher },
  ],
  exports: [RsqlParser, HttpClient, KafkaProducerService, DOMAIN_EVENT_PUBLISHER],
})
export class SharedModule {}
