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

interface RoundBody {
  actorId: string;
  fatigue: { accumulator: number; exerted: boolean };
}

const accumulator = async (gameId: string) => {
  const rounds = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==1`);
  return (rounds.body as { content: RoundBody[] }).content.find(round => round.actorId === 'aragorn')!.fatigue;
};

/* Workspace spec 080 (Core Law §5.5): a free movement takes no AP, but running tires. */
describe('free movement fatigue', () => {
  const declare = async (gameId: string) => {
    const body = { gameId, actorId: 'aragorn', actionType: 'movement', phaseStart: 1, freeAction: true };
    const declared = await as('owner').post('/v1/actions', body);
    expect(declared.status).toBe(201);
    return (declared.body as { id: string }).id;
  };
  const resolve = (id: string, pace: string) => {
    const modifiers = { pace, requiredManeuver: false, skillId: null, difficulty: null, customBonus: null };
    return as('owner').patch(`/v1/actions/${id}/movement/resolve`, { modifiers, roll: null });
  };

  it('adds the fatigue of the pace for each phase it spans, with no AP spent', async () => {
    const gameId = await gameInPhase2();
    const id = await declare(gameId);
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
    const resolved = await resolve(id, 'run');
    expect(resolved.status).toBe(200);
    expect(resolved.body).toMatchObject({ actionPoints: 0, phaseStart: 1, phaseEnd: 2 });
    const fatigue = await accumulator(gameId);
    expect(fatigue.accumulator).toBeCloseTo(4.16);
    expect(fatigue.exerted).toBe(true);
  });

  it('adds none at walking pace', async () => {
    const gameId = await gameInPhase2();
    expect((await resolve(await declare(gameId), 'walk')).status).toBe(200);
    expect((await accumulator(gameId)).accumulator).toBe(0);
  });
});
