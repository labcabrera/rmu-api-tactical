import request from 'supertest';
import { character, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

type ActorRoundBody = { id: string; actorId: string; factionId: string; effects: { id: string; status: string }[] };

let e2e: E2eApp;

const as = (user: UserName) => ({
  get: (url: string) => request(e2e.server).get(url).set('Authorization', e2e.auth(user)),
  post: (url: string, body: object = {}) => request(e2e.server).post(url).set('Authorization', e2e.auth(user)).send(body),
});

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
  e2e.world.characters.set('sam', character('sam', { resistances: [{ resistance: 'fear', totalBonus: 20 }], owner: USERS.other.sub }));
  e2e.world.characters.set('frodo', character('frodo', { resistances: [{ resistance: 'fear', totalBonus: 10 }] }));
});

afterAll(async () => {
  await e2e?.stop();
});

/** A game in round 1 with Sam and Frodo, and their actor rounds by actor id. */
const startedGame = async () => {
  const created = await as('owner').post('/v1/tactical-games', {
    strategicGameId: 'sg-1',
    name: 'Cirith Ungol',
    factions: ['faction-1'],
    actors: [
      { id: 'sam', type: 'character' },
      { id: 'frodo', type: 'character' },
    ],
  });
  expect(created.status).toBe(201);
  const gameId = (created.body as { id: string }).id;
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
  const page = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==1`);
  const rounds = (page.body as { content: ActorRoundBody[] }).content;
  return { gameId, rounds: Object.fromEntries(rounds.map(round => [round.actorId, round])) };
};

describe('resistance rolls (workspace spec 022, decision 8)', () => {
  it('rolls a fear RR with the bonus of the sheet', async () => {
    const { rounds } = await startedGame();
    const response = await as('owner').post(`/v1/actor-rounds/${rounds.sam.id}/resistance-rolls`, {
      kind: 'fear',
      attackLevel: 5,
      roll: 30,
      modifiers: [{ key: 'custom', value: 5 }],
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      actorId: 'sam',
      kind: 'fear',
      bonus: 20,
      total: 40,
      required: 60,
      resisted: false,
      failure: 20,
      result: 'mild-failure',
      severity: 'mild',
      fearState: 'balk',
    });
  });

  it('validates the body and lets only managers and the owner roll', async () => {
    const { rounds } = await startedGame();
    const url = `/v1/actor-rounds/${rounds.frodo.id}/resistance-rolls`;
    expect((await as('owner').post(url, { kind: 'spell', attackLevel: 1, roll: 1 })).status).toBe(400);
    expect((await as('other').post(url, { kind: 'fear', attackLevel: 1, roll: 50 })).status).toBe(403);
    expect(
      (await as('other').post(`/v1/actor-rounds/${rounds.sam.id}/resistance-rolls`, { kind: 'fear', attackLevel: 1, roll: 50 })).status,
    ).toBe(200);
  });
});
