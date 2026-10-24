import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { KafkaProducerService } from '../../src/modules/shared/infrastructure/messaging/kafka-producer.service';

// Smoke test of the platform (spec 020, phase 1): the whole AppModule boots against an in-memory Mongo. The full
// suite, with tokens signed against a local JWKS, comes in phase 4.
describe('rmu-api-tactical (e2e)', () => {
  let mongo: MongoMemoryServer;
  let app: INestApplication;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    Object.assign(process.env, {
      RMU_MONGO_TACTICAL_URI: mongo.getUri('rmu-tactical-e2e'),
      RMU_IAM_JWK_URI: 'http://localhost:1/certs',
      RMU_IAM_ISSUER_URI: 'http://localhost/sso/realms/rmu',
      RMU_IAM_AUDIENCE: 'rmu-api',
      RMU_IAM_TOKEN_URI: 'http://localhost:1/token',
      RMU_IAM_CLIENT_ID: 'rmu-api-tactical-e2e',
      RMU_IAM_CLIENT_SECRET: 'e2e',
      RMU_KAFKA_BROKERS: 'localhost:9092',
      RMU_KAFKA_CLIENT_ID: 'rmu-api-tactical-e2e',
      RMU_KAFKA_CONSUMER_GROUP_ID: 'rmu-api-tactical-e2e',
      RMU_API_CORE_URI: 'http://localhost:1/v1',
      RMU_API_STRATEGIC_URI: 'http://localhost:1/v1',
      RMU_API_ITEMS_URI: 'http://localhost:1/v1',
      RMU_API_NPCS_URI: 'http://localhost:1/v1',
      RMU_API_ATTACK_TABLES_URI: 'http://localhost:1/v1',
    });
    const { AppModule } = await import('../../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(KafkaProducerService)
      .useValue({ emit: () => Promise.resolve() })
      .compile();
    app = moduleRef.createNestApplication({ logger: ['error'] });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await mongo?.stop();
  });

  // The health check also pings rmu-api-core and rmu-api-strategic, so it answers 503 while they are down [F-tactical-03].
  it('answers the health check, down while the other APIs are unreachable', async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).get('/v1/health');
    const body = response.body as { status: string; details: Record<string, { status: string }> };
    expect(response.status).toBe(503);
    expect(body.details.mongodb.status).toBe('up');
    expect(body.details['rmu-api-core'].status).toBe('down');
    expect(body.details['rmu-api-strategic'].status).toBe('down');
  });

  it('rejects a request without a token', async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0]).get('/v1/tactical-games');
    expect(response.status).toBe(401);
  });
});
