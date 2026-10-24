import request from 'supertest';
import { AttackTableEntry } from '../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { character, ids, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

type ActionBody = {
  id: string;
  gameId: string;
  actorId: string;
  round: number;
  actionType: string;
  phaseStart: number;
  status: string;
  version: number;
  attacks?: { modifiers: { attackName: string; targetId: string }; roll?: { roll?: number }; results?: unknown; calculated?: unknown }[];
  [key: string]: unknown;
};

type AttackBody = {
  status: string;
  results: { attackTableEntry: { text: string; damage: number }; criticals: { key: string; status: string }[] };
};

let e2e: E2eApp;

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
  e2e.world.characters.set('aragorn', character('aragorn'));
  const [mainHand] = character('eomer').attacks;
  e2e.world.characters.set('eomer', character('eomer', { attacks: [mainHand, { ...mainHand, attackName: 'offHand' }] }));
  e2e.world.characters.set('lurtz', character('lurtz', { faction: { id: 'faction-2', name: 'Uruk-hai' } }));
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

/** A game with Aragorn (or another attacker) against Lurtz, in phase 1 of round 1. */
const gameInPhase1 = async (attacker = 'aragorn') => {
  const created = await as('owner').post('/v1/tactical-games', {
    strategicGameId: 'sg-1',
    name: 'Amon Hen',
    description: 'Parth Galen',
    factions: ['faction-1', 'faction-2'],
    actors: [
      { id: attacker, type: 'character' },
      { id: 'lurtz', type: 'character' },
    ],
  });
  expect(created.status).toBe(201);
  const gameId = (created.body as { id: string }).id;
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/initiatives/randomize`)).status).toBe(200);
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
  return gameId;
};

const declareAttack = async (gameId: string, actorId = 'aragorn') => {
  const response = await as('owner').post('/v1/actions', { gameId, actorId, actionType: 'melee_attack', phaseStart: 1 });
  expect(response.status).toBe(201);
  return response.body as ActionBody;
};

describe('declare', () => {
  it('declares an action in the current phase and lists it', async () => {
    const gameId = await gameInPhase1();
    const action = await declareAttack(gameId);
    expect(action).toMatchObject({ gameId, actorId: 'aragorn', round: 1, actionType: 'melee_attack', phaseStart: 1 });
    expect(e2e.world.events).toContainEqual(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- a nested asymmetric matcher is typed any
      expect.objectContaining({ aggregateType: 'action', event: expect.objectContaining({ eventType: 'ActionCreatedEvent' }) }),
    );

    const read = await as('owner').get(`/v1/actions/${action.id}`);
    expect(read.status).toBe(200);
    const page = await as('owner').get(`/v1/actions?q=gameId==${gameId};round==1&page=0&size=1000`);
    expect(page.status).toBe(200);
    expect(ids(page.body)).toEqual([action.id]);
  });

  it('rejects an action before the phases start', async () => {
    const created = await as('owner').post('/v1/tactical-games', {
      strategicGameId: 'sg-1',
      name: 'Weathertop',
      description: 'Amon Sul',
      factions: ['faction-1'],
      actors: [{ id: 'aragorn', type: 'character' }],
    });
    const gameId = (created.body as { id: string }).id;
    await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`);
    const response = await as('owner').post('/v1/actions', { gameId, actorId: 'aragorn', actionType: 'melee_attack', phaseStart: 1 });
    expect(response.status).toBe(400);
  });

  // rmu-mfe-tactical loads every action of a round in one page: actions go up to 1000 a page (spec 020).
  it('limits the page size to 1000', async () => {
    expect((await as('owner').get('/v1/actions?size=1000')).status).toBe(200);
    expect((await as('owner').get('/v1/actions?size=1001')).status).toBe(400);
  });

  it('changes the description with the version it read, and rejects a stale one', async () => {
    const gameId = await gameInPhase1();
    const action = await declareAttack(gameId);
    expect(action.version).toBe(0);
    const changed = await as('owner').patch(`/v1/actions/${action.id}`, { description: 'Strike', version: 0 });
    expect(changed.status).toBe(200);
    expect(changed.body).toMatchObject({ description: 'Strike', version: 1 });
    const stale = await as('owner').patch(`/v1/actions/${action.id}`, { description: 'Again', version: 0 });
    expect(stale.status).toBe(409);
    expect(stale.body).toMatchObject({ code: 'version-conflict' });
  });

  it('validates the body', async () => {
    expect((await as('owner').post('/v1/actions', { actorId: 'aragorn' })).status).toBe(400);
  });

  it('rejects a maneuver without its skill', async () => {
    const gameId = await gameInPhase1();
    const response = await as('owner').post('/v1/actions', { gameId, actorId: 'aragorn', actionType: 'maneuver', phaseStart: 1 });
    expect(response.status).toBe(400);
  });

  // The game that is not there is the caller's input: a 400, not a 404.
  it('answers 400 for an unknown game', async () => {
    const response = await as('owner').post('/v1/actions', {
      gameId: 'nope',
      actorId: 'aragorn',
      actionType: 'melee_attack',
      phaseStart: 1,
    });
    expect(response.status).toBe(400);
  });

  it('answers 404 for an unknown action', async () => {
    expect((await as('owner').get('/v1/actions/00000000-0000-0000-0000-000000000000')).status).toBe(404);
  });

  it('deletes an action', async () => {
    const gameId = await gameInPhase1();
    const action = await declareAttack(gameId);
    const deleted = await as('owner').delete(`/v1/actions/${action.id}`);
    expect(deleted.status).toBe(204);
    expect((await as('owner').get(`/v1/actions/${action.id}`)).status).toBe(404);
  });
});

describe('attack', () => {
  it('prepares, rolls and applies an attack against the fake tables', async () => {
    const gameId = await gameInPhase1();
    const action = await declareAttack(gameId);
    const rounds = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==1`);
    const lurtz = (rounds.body as { content: { id: string; actorId: string; hp: { current: number } }[] }).content.find(
      ar => ar.actorId === 'lurtz',
    )!;

    // An attack needs 2 AP: the action takes the AP of phase 1 and of phase 2.
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
    const prepared = await as('owner').patch(`/v1/actions/${action.id}/attack/prepare`, {
      attacks: [{ attackName: 'mainHand', modifiers: { targetId: 'lurtz', bo: 60 }, protectors: null }],
    });
    expect(prepared.status).toBe(200);
    expect((prepared.body as ActionBody).attacks).toHaveLength(1);

    const rolled = await as('owner').patch(`/v1/actions/${action.id}/attack/roll`, { attackName: 'mainHand', roll: 70 });
    expect(rolled.status).toBe(200);
    const attack = (rolled.body as ActionBody).attacks![0] as unknown as AttackBody;
    expect(attack.status).toBe('pending_critical_roll');
    expect(attack.results.attackTableEntry).toMatchObject({ text: '12CS', damage: 12 });
    expect(attack.results.criticals).toEqual([expect.objectContaining({ key: 's_c_1', status: 'pending_roll' })]);
    expect(e2e.world.lookups.attack.at(-1)).toMatchObject({ attackTable: 'arming-sword' });

    expect(
      (await as('owner').patch(`/v1/actions/${action.id}/attack/critical-roll`, { attackName: 'mainHand', criticalKey: 'nope', roll: 50 }))
        .status,
    ).toBe(400);
    const critical = await as('owner').patch(`/v1/actions/${action.id}/attack/critical-roll`, {
      attackName: 'mainHand',
      criticalKey: 's_c_1',
      roll: 50,
    });
    expect(critical.status).toBe(200);
    expect(e2e.world.lookups.critical.length).toBeGreaterThan(0);

    const applied = await as('owner').patch(`/v1/actions/${action.id}/attack/apply`);
    expect(applied.status).toBe(200);
    const after = await as('owner').get(`/v1/actor-rounds/${lurtz.id}`);
    // 12 of the table plus 6 of the critical.
    expect((after.body as { hp: { current: number } }).hp.current).toBe(lurtz.hp.current - 18);
  });
});

// Two attacks of one action: ApplyAttackHandler subtracts the OB of each from the attacker's actor round with parallel
// commands (Promise.all), each on its own copy. Before spec 020 the last write won and one subtraction was lost; with
// the version the second write is a 409 and the attack is left half applied [F-tactical-15].
describe('attack with two weapons', () => {
  const twoAttacks = async () => {
    const gameId = await gameInPhase1('eomer');
    const action = await declareAttack(gameId, 'eomer');
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
    const prepared = await as('owner').patch(`/v1/actions/${action.id}/attack/prepare`, {
      attacks: ['mainHand', 'offHand'].map(attackName => ({ attackName, modifiers: { targetId: 'lurtz', bo: 30 }, protectors: null })),
    });
    expect(prepared.status).toBe(200);
    e2e.world.attackEntry = new AttackTableEntry('8', 8, undefined, undefined);
    try {
      for (const attackName of ['mainHand', 'offHand']) {
        expect((await as('owner').patch(`/v1/actions/${action.id}/attack/roll`, { attackName, roll: 60 })).status).toBe(200);
      }
    } finally {
      e2e.world.attackEntry = new AttackTableEntry('12CS', 12, 'S', 'C');
    }
    return action;
  };

  it('answers 409 version-conflict when applying it [F-tactical-15]', async () => {
    const action = await twoAttacks();
    const applied = await as('owner').patch(`/v1/actions/${action.id}/attack/apply`);
    expect(applied.status).toBe(409);
    expect(applied.body).toMatchObject({ code: 'version-conflict' });
    // The conflict is on the attacker's actor round.
    const rounds = await as('owner').get(`/v1/actor-rounds?q=gameId==${action.gameId};actorId==eomer`);
    const eomer = (rounds.body as { content: { id: string }[] }).content[0];
    expect((applied.body as { message: string }).message).toContain(eomer.id);
  });

  it.skip('applies both attacks [F-tactical-15]', async () => {
    const action = await twoAttacks();
    expect((await as('owner').patch(`/v1/actions/${action.id}/attack/apply`)).status).toBe(200);
  });
});

// No handler checks who calls [F-tactical-11].
describe('permissions', () => {
  it.each(['other', 'noRole', 'admin'] as const)('lets %s declare an action for the actor of another user', async user => {
    const gameId = await gameInPhase1();
    const response = await as(user).post('/v1/actions', { gameId, actorId: 'aragorn', actionType: 'melee_attack', phaseStart: 1 });
    expect(response.status).toBe(201);
  });

  it('rejects a request without a token', async () => {
    expect((await request(e2e.server).get('/v1/actions')).status).toBe(401);
  });

  it.skip('forbids another user to declare an action for the actor of the owner [F-tactical-11]', async () => {
    const gameId = await gameInPhase1();
    const response = await as('other').post('/v1/actions', { gameId, actorId: 'aragorn', actionType: 'melee_attack', phaseStart: 1 });
    expect(response.status).toBe(403);
  });
});
