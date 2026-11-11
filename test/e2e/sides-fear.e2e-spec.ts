import request from 'supertest';
import { character, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

type Side = { id: string; name: string | null; factionIds: string[]; leaderActorId: string | null };
type GameBody = { id: string; version: number; sides: Side[]; sidesDefined: boolean; psychologyRules: string; factions: string[] };
type ErrorBody = { code: string };

let e2e: E2eApp;

const as = (user: UserName) => ({
  get: (url: string) => request(e2e.server).get(url).set('Authorization', e2e.auth(user)),
  post: (url: string, body: object = {}) => request(e2e.server).post(url).set('Authorization', e2e.auth(user)).send(body),
  put: (url: string, body: object = {}) => request(e2e.server).put(url).set('Authorization', e2e.auth(user)).send(body),
  patch: (url: string, body: object = {}) => request(e2e.server).patch(url).set('Authorization', e2e.auth(user)).send(body),
});

const faction = (id: string, name: string) => ({ faction: { id, name } }) as never;

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null, realmId: 'realm-1' });
  e2e.world.characters.set('aragorn', character('aragorn', faction('faction-1', 'Dunedain')));
  e2e.world.characters.set('boromir', character('boromir', faction('faction-2', 'Gondor')));
  e2e.world.characters.set('lurtz', character('lurtz', faction('faction-3', 'Uruks')));
});

afterAll(async () => {
  await e2e?.stop();
});

const createGame = async (extra: object = {}) => {
  const created = await as('owner').post('/v1/tactical-games', {
    strategicGameId: 'sg-1',
    name: 'Amon Hen',
    factions: ['faction-1', 'faction-2', 'faction-3'],
    actors: ['aragorn', 'boromir', 'lurtz'].map(id => ({ id, type: 'character' })),
    ...extra,
  });
  expect(created.status).toBe(201);
  return created.body as GameBody;
};

const sides = [
  { id: 'fellowship', name: 'Fellowship', factionIds: ['faction-1', 'faction-2'], leaderActorId: 'aragorn' },
  { id: 'uruks', name: null, factionIds: ['faction-3'], leaderActorId: null },
];

describe('sides of a tactical game (workspace spec 100, phase 1)', () => {
  it('serves one side per faction until the game master sets them, and the house rules by default', async () => {
    const game = await createGame();
    expect(game.sidesDefined).toBe(false);
    expect(game.psychologyRules).toBe('house');
    expect(game.sides).toEqual([
      { id: 'faction-1', name: null, factionIds: ['faction-1'], leaderActorId: null },
      { id: 'faction-2', name: null, factionIds: ['faction-2'], leaderActorId: null },
      { id: 'faction-3', name: null, factionIds: ['faction-3'], leaderActorId: null },
    ]);
    const book = await createGame({ psychologyRules: 'book' });
    expect(book.psychologyRules).toBe('book');
    const patched = await as('owner').patch(`/v1/tactical-games/${book.id}`, { psychologyRules: 'house' });
    expect([patched.status, (patched.body as GameBody).psychologyRules]).toEqual([200, 'house']);
  });

  it('sets the sides with their leader, and goes back to one per faction with an empty list', async () => {
    const game = await createGame();
    const put = await as('owner').put(`/v1/tactical-games/${game.id}/sides`, { sides, version: game.version });
    expect(put.status).toBe(200);
    expect(put.body).toMatchObject({ sidesDefined: true, sides });
    const read = (await as('owner').get(`/v1/tactical-games/${game.id}`)).body as GameBody;
    expect(read.sides).toEqual(sides);
    // A stale version is a conflict
    const stale = await as('owner').put(`/v1/tactical-games/${game.id}/sides`, { sides, version: game.version });
    expect([stale.status, (stale.body as ErrorBody).code]).toEqual([409, 'version-conflict']);
    // Only the game master
    expect((await as('other').put(`/v1/tactical-games/${game.id}/sides`, { sides })).status).toBe(403);
    const reset = await as('owner').put(`/v1/tactical-games/${game.id}/sides`, { sides: [] });
    expect([reset.status, (reset.body as GameBody).sidesDefined, (reset.body as GameBody).sides.length]).toEqual([200, false, 3]);
  });

  it('rejects an invalid partition and a leader of another side', async () => {
    const game = await createGame();
    const url = `/v1/tactical-games/${game.id}/sides`;
    const missing = await as('owner').put(url, { sides: [sides[0]] });
    expect([missing.status, (missing.body as ErrorBody).code]).toEqual([400, 'err-sides-invalid']);
    const badId = await as('owner').put(url, { sides: [{ ...sides[0], id: 'the fellowship' }, sides[1]] });
    expect([badId.status, (badId.body as ErrorBody).code]).toEqual([400, 'err-sides-invalid']);
    const leader = await as('owner').put(url, { sides: [{ ...sides[0], leaderActorId: 'lurtz' }, sides[1]] });
    expect([leader.status, (leader.body as ErrorBody).code]).toEqual([400, 'err-side-leader-invalid']);
  });

  it('locks the sides and the rules once the game started', async () => {
    const game = await createGame();
    expect((await as('owner').post(`/v1/tactical-games/${game.id}/rounds/start`)).status).toBe(200);
    const locked = await as('owner').put(`/v1/tactical-games/${game.id}/sides`, { sides });
    expect([locked.status, (locked.body as ErrorBody).code]).toEqual([409, 'err-sides-locked']);
    const rules = await as('owner').patch(`/v1/tactical-games/${game.id}`, { psychologyRules: 'book' });
    expect([rules.status, (rules.body as ErrorBody).code]).toEqual([409, 'err-game-not-created']);
  });

  it('takes a deleted faction out of its side', async () => {
    const game = await createGame();
    await as('owner').put(`/v1/tactical-games/${game.id}/sides`, { sides });
    const deleted = await request(e2e.server)
      .delete(`/v1/tactical-games/${game.id}/factions`)
      .set('Authorization', e2e.auth('owner'))
      .send({ factions: ['faction-1'] });
    expect(deleted.status).toBe(200);
    expect((deleted.body as GameBody).sides).toEqual([
      { id: 'fellowship', name: 'Fellowship', factionIds: ['faction-2'], leaderActorId: null },
      sides[1],
    ]);
  });
});
