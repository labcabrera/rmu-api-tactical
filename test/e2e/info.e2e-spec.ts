import request from 'supertest';
import { startApp, USERS, type E2eApp, type UserName } from './support/app.js';

let e2e: E2eApp;

beforeAll(async () => {
  e2e = await startApp();
});

afterAll(async () => {
  await e2e?.stop();
});

describe('GET /v1/info (spec 053)', () => {
  it('answers the name and version of the API to a signed-in user', async () => {
    const user = Object.keys(USERS)[0] as UserName;
    const response = await request(e2e.server).get('/v1/info').set('Authorization', e2e.auth(user));
    expect(response.status).toBe(200);
    const body = response.body as { name: string; version: string; uptimeSeconds: number };
    expect(body.name).toMatch(/^rmu-api-/);
    expect(typeof body.version).toBe('string');
    expect(typeof body.uptimeSeconds).toBe('number');
  });

  it('requires a token', async () => {
    expect((await request(e2e.server).get('/v1/info')).status).toBe(401);
  });
});
