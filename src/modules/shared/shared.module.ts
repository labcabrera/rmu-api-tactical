import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TerminusModule } from '@nestjs/terminus';

import { HttpModule } from '@nestjs/axios';
import { AuthModule } from 'src/modules/auth/auth.module';
import { HealthController } from './infrastructure/controller/health.controller';
import { KafkaProducerService } from './infrastructure/messaging/kafka-producer.service';
import { RsqlParser } from './infrastructure/messaging/rsql-parser';

@Module({
  imports: [TerminusModule, CqrsModule, ConfigModule, HttpModule, AuthModule],
  controllers: [HealthController],
  providers: [RsqlParser, KafkaProducerService],
  exports: [RsqlParser, KafkaProducerService],
})
export class SharedModule {}
