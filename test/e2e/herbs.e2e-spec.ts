import request from 'supertest';
import type { StrategicItem } from '../../src/modules/strategic/application/ports/item.port.js';
import { character, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

type Effect = { status: string; value?: number; rounds?: number };
type ActorRoundBody = { id: string; actorId: string; hp: { max: number; current: number }; effects: Effect[] };
type HerbResult = { actorRound: ActorRoundBody; item: { id: string }; roll?: number; healed: number; stunRoundsRemoved: number };

let e2e: E2eApp;

const as = (user: UserName) => ({
  get: (url: string) => request(e2e.server).get(url).set('Authorization', e2e.auth(user)),
  post: (url: string, body: object = {}) => request(e2e.server).post(url).set('Authorization', e2e.auth(user)).send(body),
  patch: (url: string, body: object = {}) => request(e2e.server).patch(url).set('Authorization', e2e.auth(user)).send(body),
});

// Made-up herbs (workspace spec 062): never the rows of the book.
const herb = (id: string, characterId: string, effects: object | null, category = 'herb'): StrategicItem => ({
  id,
  characterId,
  itemTypeId: `e2e-${id}`,
  name: `E2E ${id}`,
  category,
  carried: true,
  weapon: null,
  armor: null,
  shield: null,
  amount: 3,
  catalog: { features: { herb: { group: 'e2e', magical: true, effects } } },
});

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
  e2e.world.characters.set('bilbo', character('bilbo'));
  e2e.world.items.set('bilbo', [
    herb('heal-leaf', 'bilbo', { heal: { min: 4, max: 8 }, stunRelief: null }),
    herb('stun-berry', 'bilbo', { heal: null, stunRelief: 1 }),
    herb('calm-root', 'bilbo', { heal: null, stunRelief: 999 }),
    herb('plain-root', 'bilbo', null),
    { ...herb('stone', 'bilbo', null, 'gem'), catalog: null },
  ]);
  e2e.world.items.set('frodo', [herb('frodo-leaf', 'frodo', { heal: { min: 1, max: 2 } })]);
});

afterAll(async () => {
  await e2e?.stop();
});

const startedGame = async () => {
  const created = await as('owner').post('/v1/tactical-games', {
    strategicGameId: 'sg-1',
    name: 'Mirkwood',
    factions: ['faction-1'],
    actors: [{ id: 'bilbo', type: 'character' }],
  });
  expect(created.status).toBe(201);
  const gameId = (created.body as { id: string }).id;
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
  const page = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==1`);
  return (page.body as { content: ActorRoundBody[] }).content[0];
};

describe('herbs in combat (workspace spec 062)', () => {
  it('heals the hits of a dose, rolled or sent, up to the maximum', async () => {
    const round = await startedGame();
    expect((await as('owner').patch(`/v1/actor-rounds/${round.id}/hp`, { dmg: 10 })).status).toBe(200);

    const sent = await as('owner').post(`/v1/actor-rounds/${round.id}/herbs`, { itemId: 'heal-leaf', roll: 7 });
    expect(sent.status).toBe(200);
    const body = sent.body as HerbResult;
    expect(body).toMatchObject({ item: { id: 'heal-leaf' }, roll: 7, healed: 7, stunRoundsRemoved: 0 });
    expect(body.actorRound.hp.current).toBe(body.actorRound.hp.max - 3);

    const rolled = await as('owner').post(`/v1/actor-rounds/${round.id}/herbs`, { itemId: 'heal-leaf' });
    expect(rolled.status).toBe(200);
    const second = rolled.body as HerbResult;
    expect(second.roll).toBeGreaterThanOrEqual(4);
    expect(second.roll).toBeLessThanOrEqual(8);
    expect(second.healed).toBe(3);
    expect(second.actorRound.hp.current).toBe(second.actorRound.hp.max);
  });

  it('relieves rounds of stun, and every stun with 999', async () => {
    const round = await startedGame();
    expect((await as('owner').post(`/v1/actor-rounds/${round.id}/effects`, { status: 'stunned', value: -25, rounds: 2 })).status).toBe(201);
    const one = await as('owner').post(`/v1/actor-rounds/${round.id}/herbs`, { itemId: 'stun-berry' });
    expect(one.status).toBe(200);
    expect(one.body).toMatchObject({ healed: 0, stunRoundsRemoved: 1 });
    expect((one.body as HerbResult).actorRound.effects.filter(each => each.status === 'stunned')).toMatchObject([{ rounds: 1 }]);

    const all = await as('owner').post(`/v1/actor-rounds/${round.id}/herbs`, { itemId: 'calm-root' });
    expect(all.status).toBe(200);
    expect(all.body).toMatchObject({ stunRoundsRemoved: 1 });
    expect((all.body as HerbResult).actorRound.effects.filter(each => each.status === 'stunned')).toEqual([]);
  });

  it('refuses a herb without combat effect, an item that is not a herb and a herb of another character', async () => {
    const round = await startedGame();
    const codeOf = async (itemId: string) => {
      const response = await as('owner').post(`/v1/actor-rounds/${round.id}/herbs`, { itemId });
      return [response.status, (response.body as { code: string }).code];
    };
    expect(await codeOf('plain-root')).toEqual([400, 'herb-without-effect']);
    expect(await codeOf('stone')).toEqual([400, 'err-item-not-herb']);
    expect(await codeOf('frodo-leaf')).toEqual([400, 'err-herb-not-held']);
    expect(await codeOf('missing')).toEqual([404, 'err-item-not-found']);
    expect((await as('other').post(`/v1/actor-rounds/${round.id}/herbs`, { itemId: 'heal-leaf' })).status).toBe(403);
    expect((await as('owner').post(`/v1/actor-rounds/${round.id}/herbs`, {})).status).toBe(400);
  });
});
