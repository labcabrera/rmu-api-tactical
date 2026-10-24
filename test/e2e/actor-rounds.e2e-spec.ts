import request from 'supertest';
import type { StrategicItem } from '../../src/modules/strategic/application/ports/item.port.js';
import { character, ids, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

type ActorRoundBody = {
  id: string;
  version: number;
  gameId: string;
  actorId: string;
  round: number;
  initiative: { base: number; penalty: number; roll?: number; total?: number };
  hp: { max: number; current: number };
  defenseMode: { dodge: string; block: string };
  effects: { id: string; status: string; value?: number; rounds?: number }[];
  injuries: { id: string; type: string; severity: string; status: string }[];
  items: {
    itemId: string;
    kind: string;
    slot?: string;
    strength: number | null;
    modifiers: { id: string; type: string; value: number }[];
  }[];
  lastBreakageCheck?: { itemId: string; result: string; total: number };
  fatigue: { accumulator: number };
};

let e2e: E2eApp;

const item = (id: string, props: Partial<StrategicItem>): StrategicItem => ({
  id,
  characterId: 'gimli',
  itemTypeId: id,
  name: id,
  category: 'weapon',
  carried: true,
  weapon: {},
  armor: null,
  shield: null,
  info: { strength: 80, stackable: false },
  ...props,
});

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
  e2e.world.characters.set(
    'gimli',
    character('gimli', {
      equipment: { slots: { mainHand: 'axe' }, maneuverPenalty: 0, encumbrancePenalty: 0, movementBaseDifficulty: 'm' },
    }),
  );
  e2e.world.items.set('gimli', [item('axe', {})]);
  e2e.world.characters.set('legolas', character('legolas', { owner: USERS.other.sub }));
});

afterAll(async () => {
  await e2e?.stop();
});

const as = (user: UserName) => ({
  get: (url: string) => request(e2e.server).get(url).set('Authorization', e2e.auth(user)),
  post: (url: string, body: object = {}) => request(e2e.server).post(url).set('Authorization', e2e.auth(user)).send(body),
  patch: (url: string, body: object = {}) => request(e2e.server).patch(url).set('Authorization', e2e.auth(user)).send(body),
  delete: (url: string) => request(e2e.server).delete(url).set('Authorization', e2e.auth(user)),
});

/** A game in round 1 with Gimli, and his actor round. */
const startedGame = async () => {
  const created = await as('owner').post('/v1/tactical-games', {
    strategicGameId: 'sg-1',
    name: 'Helm',
    description: 'Deep',
    factions: ['faction-1'],
    actors: [{ id: 'gimli', type: 'character' }],
  });
  expect(created.status).toBe(201);
  const gameId = (created.body as { id: string }).id;
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
  const page = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==1`);
  return { gameId, actorRound: (page.body as { content: ActorRoundBody[] }).content[0] };
};

describe('read and list', () => {
  it('builds the actor round from the strategic character and its items', async () => {
    const { gameId, actorRound } = await startedGame();
    expect(actorRound).toMatchObject({ gameId, actorId: 'gimli', round: 1, hp: { max: 50, current: 50 } });
    expect(actorRound.items).toEqual([expect.objectContaining({ itemId: 'axe', kind: 'weapon', slot: 'mainHand', strength: 80 })]);

    const read = await as('owner').get(`/v1/actor-rounds/${actorRound.id}`);
    expect(read.status).toBe(200);
    expect((read.body as ActorRoundBody).id).toBe(actorRound.id);
  });

  it('lists by RSQL with paging', async () => {
    const { gameId, actorRound } = await startedGame();
    const page = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId}&page=0&size=100`);
    expect(page.status).toBe(200);
    expect(ids(page.body)).toEqual([actorRound.id]);
  });

  it('answers 404 for an unknown actor round', async () => {
    expect((await as('owner').get('/v1/actor-rounds/00000000-0000-0000-0000-000000000000')).status).toBe(404);
  });
});

describe('changes', () => {
  let actorRound: ActorRoundBody;

  beforeEach(async () => {
    ({ actorRound } = await startedGame());
  });

  it('declares the initiative roll and adds the bonus', async () => {
    const response = await as('owner').patch(`/v1/actor-rounds/${actorRound.id}/initiative`, { roll: 12 });
    expect(response.status).toBe(200);
    const initiative = (response.body as ActorRoundBody).initiative;
    expect(initiative.roll).toBe(12);
    expect(initiative.total).toBe(initiative.base + initiative.penalty + 12);
  });

  it('validates the initiative body', async () => {
    expect((await as('owner').patch(`/v1/actor-rounds/${actorRound.id}/initiative`, { roll: 'x' })).status).toBe(400);
  });

  it('declares the defense mode and rejects an unknown level', async () => {
    const response = await as('owner').patch(`/v1/actor-rounds/${actorRound.id}/defense-mode`, { dodge: 'passive' });
    expect(response.status).toBe(200);
    expect((response.body as ActorRoundBody).defenseMode.dodge).toBe('passive');
    expect((await as('owner').patch(`/v1/actor-rounds/${actorRound.id}/defense-mode`, { dodge: 'heroic' })).status).toBe(400);
  });

  it('takes damage and heals through the hit points', async () => {
    const hit = await as('owner').patch(`/v1/actor-rounds/${actorRound.id}/hp`, { dmg: 12 });
    expect(hit.status).toBe(200);
    expect((hit.body as ActorRoundBody).hp.current).toBe(38);
    // Each write moves the version of optimistic concurrency.
    expect((hit.body as ActorRoundBody).version).toBe(actorRound.version + 1);
    const healed = await as('owner').patch(`/v1/actor-rounds/${actorRound.id}/hp`, { dmg: -5 });
    expect((healed.body as ActorRoundBody).hp.current).toBe(43);
  });

  it('adds and deletes an effect', async () => {
    const added = await as('owner').post(`/v1/actor-rounds/${actorRound.id}/effects`, { status: 'stunned', rounds: 2 });
    expect(added.status).toBe(201);
    const effect = (added.body as ActorRoundBody).effects.find(e => e.status === 'stunned')!;
    expect(effect).toMatchObject({ rounds: 2 });

    const deleted = await as('owner').delete(`/v1/actor-rounds/${actorRound.id}/effects/${effect.id}`);
    expect(deleted.status).toBe(200);
    expect((deleted.body as ActorRoundBody).effects.some(e => e.id === effect.id)).toBe(false);
  });

  it('accumulates fatigue', async () => {
    const response = await as('owner').patch(`/v1/actor-rounds/${actorRound.id}/fatigue-accumulator`, { fatigueAccumulator: 3 });
    expect(response.status).toBe(200);
  });

  it('resolves a breakage check of an item and keeps the damage as a modifier', async () => {
    const failed = await as('owner').post(`/v1/actor-rounds/${actorRound.id}/breakage-checks`, { itemId: 'axe', roll: -30 });
    expect(failed.status).toBe(200);
    const body = failed.body as ActorRoundBody;
    expect(body.lastBreakageCheck).toMatchObject({ itemId: 'axe', result: 'failure' });
    expect(body.items[0].modifiers).toEqual([expect.objectContaining({ type: 'breakage' })]);

    const passed = await as('owner').post(`/v1/actor-rounds/${actorRound.id}/breakage-checks`, { itemId: 'axe', roll: 50 });
    expect(passed.status).toBe(200);
    expect((passed.body as ActorRoundBody).lastBreakageCheck).toMatchObject({ itemId: 'axe' });
  });

  it('rejects a breakage check of an item the actor does not have', async () => {
    const response = await as('owner').post(`/v1/actor-rounds/${actorRound.id}/breakage-checks`, { itemId: 'nope', roll: 10 });
    expect(response.status).toBe(404);
  });

  it('answers 404 for a change to an unknown actor round', async () => {
    expect((await as('owner').patch('/v1/actor-rounds/00000000-0000-0000-0000-000000000000/hp', { dmg: 1 })).status).toBe(404);
  });
});

describe('finished game', () => {
  it('rejects changes once the game is finished', async () => {
    const { gameId, actorRound } = await startedGame();
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/finish`, { fates: [] })).status).toBe(200);

    const response = await as('owner').patch(`/v1/actor-rounds/${actorRound.id}/hp`, { dmg: 1 });
    expect(response.status).toBe(409);
  });
});

// Spec 021, decision 2 [F-tactical-11]: an actor round is changed by a manager of the game or the owner of its actor,
// and read as the game is read. Actor rounds are created when a round starts and deleted with the game, so their
// create and delete go through the game (see the permissions of tactical-games.e2e-spec.ts).
describe('permissions', () => {
  /** A game of the owner in round 1 with Gimli (of the owner) and Legolas (of the other user). */
  const sharedGame = async () => {
    const created = await as('owner').post('/v1/tactical-games', {
      strategicGameId: 'sg-1',
      name: 'Helm',
      description: 'Deep',
      factions: ['faction-1'],
      actors: [
        { id: 'gimli', type: 'character' },
        { id: 'legolas', type: 'character' },
      ],
    });
    const gameId = (created.body as { id: string }).id;
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
    const page = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==1`);
    const rounds = (page.body as { content: ActorRoundBody[] }).content;
    return { gameId, gimli: rounds.find(ar => ar.actorId === 'gimli')!, legolas: rounds.find(ar => ar.actorId === 'legolas')! };
  };

  it.each(['owner', 'admin'] as const)('lets %s change any actor round of the game', async user => {
    const { gimli, legolas } = await sharedGame();
    expect((await as(user).patch(`/v1/actor-rounds/${gimli.id}/hp`, { dmg: 1 })).status).toBe(200);
    expect((await as(user).patch(`/v1/actor-rounds/${legolas.id}/hp`, { dmg: 1 })).status).toBe(200);
  });

  it('lets the owner of an actor change its actor round, and only that one', async () => {
    const { gimli, legolas } = await sharedGame();
    expect((await as('other').patch(`/v1/actor-rounds/${legolas.id}/hp`, { dmg: 1 })).status).toBe(200);
    expect((await as('other').patch(`/v1/actor-rounds/${gimli.id}/hp`, { dmg: 1 })).status).toBe(403);
  });

  it.each(['other', 'noRole'] as const)('forbids %s to change the actor round of another user [F-tactical-11]', async user => {
    const { actorRound } = await startedGame();
    expect((await as(user).patch(`/v1/actor-rounds/${actorRound.id}/hp`, { dmg: 1 })).status).toBe(403);
    expect((await as(user).post(`/v1/actor-rounds/${actorRound.id}/effects`, { effect: { status: 'stunned', rounds: 1 } })).status).toBe(
      403,
    );
    expect((await as('owner').get(`/v1/actor-rounds/${actorRound.id}`)).body).toMatchObject({ hp: actorRound.hp });
  });

  it('reads as the game is read, and lists only the actor rounds of readable games', async () => {
    const { gameId, actorRound } = await startedGame();
    expect((await as('admin').get(`/v1/actor-rounds/${actorRound.id}`)).status).toBe(200);
    expect((await as('noRole').get(`/v1/actor-rounds/${actorRound.id}`)).status).toBe(403);
    expect(ids((await as('noRole').get(`/v1/actor-rounds?q=gameId==${gameId}`)).body)).toEqual([]);
    expect(ids((await as('admin').get(`/v1/actor-rounds?q=gameId==${gameId}`)).body)).toEqual([actorRound.id]);
    const { gameId: shared, legolas } = await sharedGame();
    expect((await as('other').get(`/v1/actor-rounds/${legolas.id}`)).status).toBe(200);
    expect(ids((await as('other').get(`/v1/actor-rounds?q=gameId==${shared}`)).body)).toHaveLength(2);
  });

  it('rejects a request without a token', async () => {
    const { actorRound } = await startedGame();
    expect((await request(e2e.server).patch(`/v1/actor-rounds/${actorRound.id}/hp`).send({ dmg: 1 })).status).toBe(401);
  });
});
