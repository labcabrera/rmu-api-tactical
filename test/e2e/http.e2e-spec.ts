import request from 'supertest';
import { startApp, USERS, type E2eApp } from './support/app.js';

// The HTTP setup of core (spec 020, phase 5): security headers, CORS only for the listed origins and the request limit.
describe('HTTP setup', () => {
  let e2e: E2eApp;

  beforeAll(async () => {
    e2e = await startApp({ RMU_THROTTLE_LIMIT: '3', RMU_CORS_ORIGINS: 'http://allowed.test' });
    e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
  });

  afterAll(async () => {
    await e2e?.stop();
  });

  // The health check answers 503 here: it also pings rmu-api-core and rmu-api-strategic, which are not running [F-tactical-03].
  it('sends the helmet headers', async () => {
    const response = await request(e2e.server).get('/v1/health');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toBeDefined();
  });

  it('answers CORS only to the listed origins', async () => {
    const allowed = await request(e2e.server).get('/v1/health').set('Origin', 'http://allowed.test');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://allowed.test');
    const other = await request(e2e.server).get('/v1/health').set('Origin', 'http://other.test');
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('limits the requests of a client but never the health check', async () => {
    for (let i = 0; i < 5; i++) expect((await request(e2e.server).get('/v1/health')).status).not.toBe(429);
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      statuses.push((await request(e2e.server).get('/v1/tactical-games').set('Authorization', e2e.auth('owner'))).status);
    }
    expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
    expect(statuses[3]).toBe(429);
  });
});
