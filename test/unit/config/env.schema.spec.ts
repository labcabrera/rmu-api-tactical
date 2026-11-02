import { describe, expect, it } from 'vitest';
import { envSchema } from '../../../src/config/env.schema.js';

const required = {
  RMU_MONGO_TACTICAL_URI: 'mongodb://localhost/rmu-tactical',
  RMU_IAM_JWK_URI: 'http://localhost/sso/certs',
  RMU_IAM_ISSUER_URI: 'http://localhost/sso/realms/rmu',
  RMU_IAM_AUDIENCE: 'rmu-api',
  RMU_IAM_TOKEN_URI: 'http://localhost/sso/token',
  RMU_IAM_CLIENT_ID: 'rmu-api-tactical',
  RMU_IAM_CLIENT_SECRET: 'secret',
  RMU_KAFKA_BROKERS: 'localhost:9092',
  RMU_KAFKA_CLIENT_ID: 'rmu-api-tactical',
  RMU_API_CORE_URI: 'http://localhost:3001/v1',
  RMU_API_ITEMS_URI: 'http://localhost:3006/v1',
  RMU_API_ATTACK_TABLES_URI: 'http://localhost:3005/v1',
  RMU_API_STRATEGIC_URI: 'http://localhost:3002/v1',
  RMU_API_NPCS_URI: 'http://localhost:3007/v1',
};

describe('envSchema', () => {
  it('defaults the port to the one of rmu-api-tactical [F-tactical-05] and the HTTP timeout to 10 s', () => {
    const { error, value } = envSchema.validate(required) as { error?: Error; value: Record<string, unknown> };
    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3003);
    expect(value.RMU_HTTP_TIMEOUT_MS).toBe(10_000);
  });

  it('fails on a missing required variable', () => {
    const rest: Partial<typeof required> = { ...required };
    delete rest.RMU_MONGO_TACTICAL_URI;
    expect(envSchema.validate(rest).error?.message).toContain('RMU_MONGO_TACTICAL_URI');
  });
});
