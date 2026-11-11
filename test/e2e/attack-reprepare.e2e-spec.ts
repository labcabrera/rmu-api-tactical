import request from 'supertest';
import { AttackTableEntry } from '../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { character, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

/*
 * Workspace spec 101: going back in the attack dialog prepares the attack again. Before it is applied that starts the
 * attack over (no parries declared, no rolls) and gives back every OB the action had reserved; once applied it is closed.
 * Every actor has OB 60.
 */
let e2e: E2eApp;

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
  e2e.world.characters.set('aragorn', character('aragorn'));
  e2e.world.characters.set('lurtz', character('lurtz', { faction: { id: 'faction-2', name: 'Uruk-hai' } }));
  e2e.world.attackEntry = new AttackTableEntry('0', 0, undefined, undefined);
});

afterAll(async () => {
  await e2e?.stop();
});

const as = (user: UserName) => ({
  get: (url: string) => request(e2e.server).get(url).set('Authorization', e2e.auth(user)),
  post: (url: string, body: object = {}) => request(e2e.server).post(url).set('Authorization', e2e.auth(user)).send(body),
  patch: (url: string, body: object = {}) => request(e2e.server).patch(url).set('Authorization', e2e.auth(user)).send(body),
});

interface ActionBody {
  id: string;
  status: string;
  code?: string;
  parries: { id: string; actorId: string; parry: number }[];
  attacks: { modifiers: { positionalTarget?: string }; roll?: { roll?: number | null } | null; calculated?: { rollTotal: number } }[];
}

interface RoundBody {
  actorId: string;
  boReservations: unknown[];
  attacks: { attackName: string; currentBo: number }[];
}

const newGame = async () => {
  const created = await as('owner').post('/v1/tactical-games', {
    strategicGameId: 'sg-1',
    name: 'Parth Galen',
    factions: ['faction-1', 'faction-2'],
    actors: ['aragorn', 'lurtz'].map(id => ({ id, type: 'character' })),
  });
  expect(created.status).toBe(201);
  const gameId = (created.body as { id: string }).id;
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/initiatives/randomize`)).status).toBe(200);
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
  return gameId;
};

const declare = async (gameId: string, actorId: string) => {
  const response = await as('owner').post('/v1/actions', { gameId, actorId, actionType: 'melee_attack', phaseStart: 1 });
  expect(response.status).toBe(201);
  return (response.body as ActionBody).id;
};

const prepare = (id: string, positionalTarget = 'none') =>
  as('owner').patch(`/v1/actions/${id}/attack/prepare`, {
    attacks: [{ attackName: 'mainHand', modifiers: { targetId: 'aragorn', bo: 60, positionalTarget }, protectors: null }],
  });

const roundOf = async (gameId: string, actorId: string) => {
  const rounds = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==1`);
  return (rounds.body as { content: RoundBody[] }).content.find(each => each.actorId === actorId)!;
};

const obOf = async (gameId: string, actorId: string) =>
  (await roundOf(gameId, actorId)).attacks.find(a => a.attackName === 'mainHand')!.currentBo;

/** Lurtz attacks Aragorn, who parries with 30; the attack is rolled and waits to be applied. */
const rolledAttack = async () => {
  const gameId = await newGame();
  const foe = await declare(gameId, 'lurtz');
  await declare(gameId, 'aragorn');
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
  const prepared = await prepare(foe);
  expect(prepared.status).toBe(200);
  const option = (prepared.body as ActionBody).parries.find(each => each.actorId === 'aragorn')!;
  expect((await as('owner').patch(`/v1/actions/${foe}/attack/parry`, { parries: [{ parryId: option.id, parry: 30 }] })).status).toBe(200);
  const rolled = await as('owner').patch(`/v1/actions/${foe}/attack/roll`, { attackName: 'mainHand', roll: 40 });
  expect(rolled.status).toBe(200);
  expect((rolled.body as ActionBody).status).toBe('pending_apply');
  expect(await obOf(gameId, 'aragorn')).toBe(30);
  return { gameId, foe, before: (prepared.body as ActionBody).attacks[0].calculated!.rollTotal };
};

describe('preparing an attack again (workspace spec 101)', () => {
  it('starts it over before it is applied: new modifiers, parries to declare, no rolls, OB given back', async () => {
    const { gameId, foe, before } = await rolledAttack();

    const again = await prepare(foe, 'flank');

    expect(again.status).toBe(200);
    const body = again.body as ActionBody;
    expect(body.status).toBe('parry');
    expect(body.parries.find(each => each.actorId === 'aragorn')!.parry).toBe(0);
    expect(body.attacks[0].modifiers.positionalTarget).toBe('flank');
    expect(body.attacks[0].roll?.roll ?? null).toBeNull();
    expect(body.attacks[0].calculated!.rollTotal).not.toBe(before);
    expect(await obOf(gameId, 'aragorn')).toBe(60);
    expect((await roundOf(gameId, 'aragorn')).boReservations).toEqual([]);
    expect((await roundOf(gameId, 'lurtz')).boReservations).toEqual([]);
  });

  it('is rejected once the attack is applied', async () => {
    const { foe } = await rolledAttack();
    expect((await as('owner').patch(`/v1/actions/${foe}/attack/apply`)).status).toBe(200);

    const again = await prepare(foe, 'flank');

    expect(again.status).toBeGreaterThanOrEqual(400);
    expect((again.body as ActionBody).code).toBe('err-action-closed');
  });
});
