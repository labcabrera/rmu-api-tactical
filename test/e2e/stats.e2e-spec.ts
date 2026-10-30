import request from 'supertest';
import type { TacticalStats } from '../../src/modules/stats/domain/tactical-stats.js';
import { startApp, type E2eApp } from './support/app.js';

const NOW = new Date();
const monthsAgo = (months: number) => new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth() - months, 2));
const month = (date: Date) => date.toISOString().slice(0, 7);

let e2e: E2eApp;

beforeAll(async () => {
  e2e = await startApp();
  await e2e.connection.collection('tactical-games').insertMany([
    { _id: 'g1', name: 'A', status: 'in_progress', createdAt: NOW },
    { _id: 'g2', name: 'B', status: 'created', createdAt: monthsAgo(2) },
    { _id: 'g3', name: 'C', status: 'finished', createdAt: monthsAgo(2) },
  ] as never[]);
});

afterAll(async () => {
  await e2e?.stop();
});

const stats = (body: unknown) => body as TacticalStats;

describe('GET /v1/stats (spec 053)', () => {
  it('counts by status and by month of creation for an administrator', async () => {
    const response = await request(e2e.server).get('/v1/stats').set('Authorization', e2e.auth('admin'));
    expect(response.status).toBe(200);
    const body = stats(response.body);
    expect(body.games.total).toBe(3);
    expect(body.games.byStatus).toEqual({ in_progress: 1, created: 1, finished: 1 });
    expect(body.games.createdByMonth).toHaveLength(12);
    expect(body.games.createdByMonth.at(-1)).toEqual({ month: month(NOW), count: 1 });
    expect(body.games.createdByMonth.find(entry => entry.month === month(monthsAgo(2)))?.count).toBe(2);
  });

  it('is forbidden to a user who is not an administrator', async () => {
    const response = await request(e2e.server).get('/v1/stats').set('Authorization', e2e.auth('owner'));
    expect(response.status).toBe(403);
  });

  it('requires a token', async () => {
    expect((await request(e2e.server).get('/v1/stats')).status).toBe(401);
  });
});
