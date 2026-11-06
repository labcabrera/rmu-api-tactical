import request from 'supertest';
import { AttackTableEntry } from '../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { character, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

/* Workspace spec 082, ADR 0012: one margin of OB shared by the attacks of the actor. */
let e2e: E2eApp;

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
  e2e.world.characters.set('aragorn', character('aragorn'));
  const [mainHand] = character('eomer').attacks;
  e2e.world.characters.set('eomer', character('eomer', { attacks: [mainHand, { ...mainHand, attackName: 'offHand' }] }));
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
  parries: { id: string; actorId: string; parryAvailable: number }[];
  attacks: {
    attackName: string;
    modifiers: { bo: number };
    calculated: { rollTotal: number; rollModifiers: { key: string; value: number }[] };
  }[];
  warnings?: { code: string; params: Record<string, unknown> }[];
}

const gameWith = async (attacker: string) => {
  const created = await as('owner').post('/v1/tactical-games', {
    strategicGameId: 'sg-1',
    name: 'Amon Hen',
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

const declare = async (gameId: string, actorId: string) => {
  const response = await as('owner').post('/v1/actions', { gameId, actorId, actionType: 'melee_attack', phaseStart: 1 });
  expect(response.status).toBe(201);
  return (response.body as ActionBody).id;
};

const nextPhase = async (gameId: string) => expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);

const prepare = (id: string, targetId: string, bos: Record<string, number>) =>
  as('owner').patch(`/v1/actions/${id}/attack/prepare`, {
    attacks: Object.entries(bos).map(([attackName, bo]) => ({ attackName, modifiers: { targetId, bo }, protectors: null })),
  });

const attacksOf = async (gameId: string, actorId: string) => {
  const rounds = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==1`);
  const body = rounds.body as { content: { actorId: string; attacks: { attackName: string; currentBo: number }[] }[] };
  return Object.fromEntries(body.content.find(round => round.actorId === actorId)!.attacks.map(each => [each.attackName, each.currentBo]));
};

describe('spending OB', () => {
  it('leaves two weapons the same margin to parry, not their sum subtracted from each', async () => {
    const gameId = await gameWith('eomer');
    const id = await declare(gameId, 'eomer');
    await nextPhase(gameId);
    expect((await prepare(id, 'lurtz', { mainHand: 40, offHand: 40 })).status).toBe(200);
    expect((await as('owner').patch(`/v1/actions/${id}/attack/parry`, { parries: [] })).status).toBe(200);
    for (const attackName of ['mainHand', 'offHand']) {
      expect((await as('owner').patch(`/v1/actions/${id}/attack/roll`, { attackName, roll: 40 })).status).toBe(200);
    }
    expect((await as('owner').patch(`/v1/actions/${id}/attack/apply`)).status).toBe(200);
    expect(await attacksOf(gameId, 'eomer')).toEqual({ mainHand: 20, offHand: 20 });
  });
});

describe('attacks without OB', () => {
  it('rejects preparing an attack at 0', async () => {
    const gameId = await gameWith('aragorn');
    const id = await declare(gameId, 'aragorn');
    await nextPhase(gameId);
    const prepared = await prepare(id, 'lurtz', { mainHand: 0 });
    expect(prepared.status).toBe(400);
    expect(prepared.body).toMatchObject({ code: 'err-attack-no-ob' });
  });
});

describe('a parry after preparing an attack', () => {
  const parryWith = async (gameId: string, parry: number) => {
    const attack = await declare(gameId, 'lurtz');
    const own = await declare(gameId, 'aragorn');
    await nextPhase(gameId);
    expect((await prepare(own, 'lurtz', { mainHand: 60 })).status).toBe(200);
    const prepared = await prepare(attack, 'aragorn', { mainHand: 60 });
    expect(prepared.status).toBe(200);
    const option = (prepared.body as ActionBody).parries.find(each => each.actorId === 'aragorn')!;
    expect((await as('owner').patch(`/v1/actions/${attack}/attack/parry`, { parries: [{ parryId: option.id, parry }] })).status).toBe(200);
    expect((await as('owner').patch(`/v1/actions/${attack}/attack/roll`, { attackName: 'mainHand', roll: 40 })).status).toBe(200);
    const applied = await as('owner').patch(`/v1/actions/${attack}/attack/apply`);
    expect(applied.status).toBe(200);
    return { own, applied: applied.body as ActionBody };
  };

  it('lowers the OB of the attack, its total and warns', async () => {
    const gameId = await gameWith('aragorn');
    const before = 60;
    const { own, applied } = await parryWith(gameId, 40);
    expect(applied.warnings).toContainEqual(
      expect.objectContaining({
        code: 'attack-ob-reduced',
        params: expect.objectContaining({ attackName: 'mainHand', from: before, to: 20 }) as object,
      }),
    );
    const action = (await as('owner').get(`/v1/actions/${own}`)).body as ActionBody;
    const [attack] = action.attacks;
    expect(attack.modifiers.bo).toBe(20);
    expect(attack.calculated.rollModifiers.find(modifier => modifier.key === 'bo')?.value).toBe(20);
    expect(attack.calculated.rollTotal).toBe(attack.calculated.rollModifiers.reduce((sum, modifier) => sum + modifier.value, 0));
  });

  it('rejects the roll of an attack left at 0', async () => {
    const gameId = await gameWith('aragorn');
    const { own } = await parryWith(gameId, 60);
    const rolled = await as('owner').patch(`/v1/actions/${own}/attack/roll`, { attackName: 'mainHand', roll: 40 });
    expect(rolled.status).toBe(400);
    expect(rolled.body).toMatchObject({ code: 'err-attack-no-ob' });
  });
});
