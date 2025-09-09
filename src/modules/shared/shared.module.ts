import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TerminusModule } from '@nestjs/terminus';

import { HttpModule } from '@nestjs/axios';
import { AuthModule } from 'src/modules/auth/auth.module';
import { RsqlParser } from './infrastructure/db/rsql-parser';
import { KafkaProducerService } from './infrastructure/messaging/kafka-producer.service';
import { HealthController } from './interfaces/http/health.controller';

@Module({
  imports: [TerminusModule, CqrsModule, ConfigModule, HttpModule, AuthModule],
  controllers: [HealthController],
  providers: [RsqlParser, KafkaProducerService],
  exports: [RsqlParser, KafkaProducerService],
})
export class SharedModule {}
