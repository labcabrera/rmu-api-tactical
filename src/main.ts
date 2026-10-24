import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { configureHttp } from './bootstrap/http';
import { configureLogger } from './bootstrap/logger';
import { configureOpenApi } from './bootstrap/openapi';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: configureLogger(process.env.LOG_LEVEL) });
  const config = app.get(ConfigService);
  configureHttp(app);
  configureOpenApi(app);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: { clientId: config.get<string>('RMU_KAFKA_CLIENT_ID'), brokers: config.get<string>('RMU_KAFKA_BROKERS')!.split(',') },
      // The schema defaults it to rmu-api-tactical-group: without one Nest would fall back to a group shared with every API.
      consumer: { groupId: config.get<string>('RMU_KAFKA_CONSUMER_GROUP_ID')! },
    },
  });
  await app.listen(config.get<number>('PORT')!);
  await app.startAllMicroservices();
}

// A failed start (Mongo, Kafka, a port in use) ends the process, so the container restarts instead of hanging.
bootstrap().catch((error: unknown) => {
  new Logger('Bootstrap').fatal(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exit(1);
});
