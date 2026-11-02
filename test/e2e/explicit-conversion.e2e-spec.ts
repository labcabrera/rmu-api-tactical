import request from 'supertest';
import { character, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

// Spec 044, fallo 10: the ValidationPipe no longer converts implicitly. Bodies are validated as they come, the paging
// of the query is converted by its DTO, and nested bodies are classes only through @Type.
let e2e: E2eApp;

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
  e2e.world.characters.set('aragorn', character('aragorn'));
  e2e.world.characters.set('lurtz', character('lurtz', { faction: { id: 'faction-2', name: 'Uruk-hai' } }));
});

afterAll(async () => {
  await e2e?.stop();
});

const as = (user: UserName) => ({
  get: (url: string) => request(e2e.server).get(url).set('Authorization', e2e.auth(user)),
  post: (url: string, body: object = {}) => request(e2e.server).post(url).set('Authorization', e2e.auth(user)).send(body),
  patch: (url: string, body: object = {}) => request(e2e.server).patch(url).set('Authorization', e2e.auth(user)).send(body),
});

const gameBody = (overrides: Record<string, unknown> = {}) => ({
  strategicGameId: 'sg-1',
  name: 'Amon Hen',
  factions: ['faction-1', 'faction-2'],
  actors: [
    { id: 'aragorn', type: 'character' },
    { id: 'lurtz', type: 'character' },
  ],
  ...overrides,
});

/** A game in phase 2 of round 1, so an action declared in phase 1 has the AP of an attack. */
const gameInPhase2 = async () => {
  const created = await as('owner').post('/v1/tactical-games', gameBody());
  expect(created.status).toBe(201);
  const gameId = (created.body as { id: string }).id;
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/initiatives/randomize`)).status).toBe(200);
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
  return gameId;
};

const declare = async (gameId: string, actionType: string) => {
  const response = await as('owner').post('/v1/actions', { gameId, actorId: 'aragorn', actionType, phaseStart: 1 });
  expect(response.status).toBe(201);
  return (response.body as { id: string }).id;
};

describe('bodies', () => {
  it('rejects a number in a string field instead of storing it as a string', async () => {
    const response = await as('owner').post('/v1/tactical-games', gameBody({ name: 42 }));
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ statusCode: 400 });
  });

  it('rejects the string "true" in a boolean field', async () => {
    const gameId = await gameInPhase2();
    const action = { gameId, actorId: 'aragorn', actionType: 'melee_attack', phaseStart: 1 };
    expect((await as('owner').post('/v1/actions', { ...action, freeAction: 'true' })).status).toBe(400);
  });

  it('validates every attack of a prepare, and keeps their modifiers', async () => {
    const gameId = await gameInPhase2();
    const id = await declare(gameId, 'melee_attack');
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
    const attack = { attackName: 'mainHand', modifiers: { targetId: 'lurtz', bo: 60 }, protectors: null };
    expect((await as('owner').patch(`/v1/actions/${id}/attack/prepare`, { attacks: [{ ...attack, attackName: 42 }] })).status).toBe(400);
    const prepared = await as('owner').patch(`/v1/actions/${id}/attack/prepare`, { attacks: [attack] });
    expect(prepared.status).toBe(200);
    expect(prepared.body).toMatchObject({ attacks: [{ modifiers: { targetId: 'lurtz', bo: 60 } }] });
  });

  it('validates the nested modifiers of a movement', async () => {
    const gameId = await gameInPhase2();
    const id = await declare(gameId, 'movement');
    const modifiers = { pace: 'walk', requiredManeuver: false, skillId: null, difficulty: null, customBonus: null };
    const resolve = (body: object) => as('owner').patch(`/v1/actions/${id}/movement/resolve`, body);
    expect((await resolve({ modifiers: { ...modifiers, requiredManeuver: 'false' }, roll: null })).status).toBe(400);
    expect((await resolve({ modifiers: { ...modifiers, customBonus: '5' }, roll: null })).status).toBe(400);
    const resolved = await resolve({ modifiers, roll: null });
    expect(resolved.status).toBe(200);
    expect(resolved.body).toMatchObject({ movement: { modifiers: { pace: 'walk', requiredManeuver: false } } });
  });
});

describe('query', () => {
  it('still pages the listings from the query', async () => {
    const gameId = await gameInPhase2();
    const games = await as('owner').get('/v1/tactical-games?page=1&size=20');
    expect(games.status).toBe(200);
    expect(games.body).toMatchObject({ pagination: { page: 1, size: 20 } });
    const rounds = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId}&page=0&size=100`);
    expect(rounds.status).toBe(200);
    expect(rounds.body).toMatchObject({ pagination: { page: 0, size: 100, totalElements: 2 } });
    const actions = await as('owner').get(`/v1/actions?q=gameId==${gameId}&page=0&size=1000`);
    expect(actions.status).toBe(200);
    expect(actions.body).toMatchObject({ pagination: { page: 0, size: 1000 } });
    expect((await as('owner').get('/v1/tactical-games?page=x')).status).toBe(400);
    expect((await as('owner').get('/v1/actor-rounds?size=101')).status).toBe(400);
  });
});
