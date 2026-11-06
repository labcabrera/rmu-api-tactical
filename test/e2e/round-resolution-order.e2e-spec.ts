import request from 'supertest';
import { AttackTableEntry } from '../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { character, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

/* Workspace spec 083, ADR 0013: the OB counts from when it is committed. Every actor has OB 60. */
let e2e: E2eApp;

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
  e2e.world.characters.set('aragorn', character('aragorn'));
  e2e.world.characters.set('lurtz', character('lurtz', { faction: { id: 'faction-2', name: 'Uruk-hai' } }));
  e2e.world.characters.set('ugluk', character('ugluk', { faction: { id: 'faction-2', name: 'Uruk-hai' } }));
  e2e.world.attackEntry = new AttackTableEntry('0', 0, undefined, undefined);
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

interface ActionBody {
  id: string;
  status: string;
  parries: { id: string; actorId: string; parry: number; parryAvailable: number }[];
  attacks: { modifiers: { bo: number } }[];
  warnings?: { code: string; params: Record<string, unknown> }[];
}

interface RoundBody {
  id: string;
  actorId: string;
  initiative: { total: number; lowered?: number };
  parries: number[];
  boReservations: unknown[];
  attacks: { attackName: string; currentBo: number }[];
}

const newGame = async () => {
  const created = await as('owner').post('/v1/tactical-games', {
    strategicGameId: 'sg-1',
    name: 'Amon Hen',
    factions: ['faction-1', 'faction-2'],
    actors: ['aragorn', 'lurtz', 'ugluk'].map(id => ({ id, type: 'character' })),
  });
  expect(created.status).toBe(201);
  const gameId = (created.body as { id: string }).id;
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/initiatives/randomize`)).status).toBe(200);
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
  return gameId;
};

const declare = async (gameId: string, actorId: string, extra: object = {}) => {
  const response = await as('owner').post('/v1/actions', { gameId, actorId, actionType: 'melee_attack', phaseStart: 1, ...extra });
  expect(response.status).toBe(201);
  return (response.body as ActionBody).id;
};

const nextPhase = async (gameId: string) => expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);

const prepare = (id: string, targetId: string, bo: number) =>
  as('owner').patch(`/v1/actions/${id}/attack/prepare`, {
    attacks: [{ attackName: 'mainHand', modifiers: { targetId, bo }, protectors: null }],
  });

const parry = (id: string, parryId: string, value: number, extra: object = {}) =>
  as('owner').patch(`/v1/actions/${id}/attack/parry`, { parries: [{ parryId, parry: value, ...extra }] });

const roll = (id: string) => as('owner').patch(`/v1/actions/${id}/attack/roll`, { attackName: 'mainHand', roll: 40 });

const roundOf = async (gameId: string, actorId: string, round = 1) => {
  const rounds = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==${round}`);
  return (rounds.body as { content: RoundBody[] }).content.find(each => each.actorId === actorId)!;
};

const obOf = async (gameId: string, actorId: string) =>
  (await roundOf(gameId, actorId)).attacks.find(a => a.attackName === 'mainHand')!.currentBo;

const actionOf = async (id: string) => (await as('owner').get(`/v1/actions/${id}`)).body as ActionBody;

/** A foe attacks Aragorn: the action prepared and the id of his parry. */
const foeAttacks = async (id: string) => {
  const prepared = await prepare(id, 'aragorn', 60);
  expect(prepared.status).toBe(200);
  return (prepared.body as ActionBody).parries.find(each => each.actorId === 'aragorn')!;
};

describe('a parry counts from when it is declared', () => {
  it('leaves its own attack the OB left (V1)', async () => {
    const gameId = await newGame();
    const foe = await declare(gameId, 'lurtz');
    const own = await declare(gameId, 'aragorn');
    await nextPhase(gameId);
    const option = await foeAttacks(foe);
    expect((await parry(foe, option.id, 20)).status).toBe(200);

    expect(await obOf(gameId, 'aragorn')).toBe(40);
    expect((await prepare(own, 'lurtz', 60)).status).toBe(400);
    expect((await prepare(own, 'lurtz', 40)).status).toBe(200);
  });

  it('warns when it declares, and lowers the attack it had prepared', async () => {
    const gameId = await newGame();
    const foe = await declare(gameId, 'lurtz');
    const own = await declare(gameId, 'aragorn');
    await nextPhase(gameId);
    expect((await prepare(own, 'lurtz', 60)).status).toBe(200);
    const option = await foeAttacks(foe);
    const declared = await parry(foe, option.id, 20);

    expect((declared.body as ActionBody).warnings).toContainEqual(
      expect.objectContaining({ code: 'attack-ob-reduced', params: expect.objectContaining({ from: 60, to: 40 }) as object }),
    );
    expect((await actionOf(own)).attacks[0].modifiers.bo).toBe(40);
  });

  it('shares the OB between two foes: the second parry gets what is left (V3)', async () => {
    const gameId = await newGame();
    const first = await declare(gameId, 'lurtz');
    const second = await declare(gameId, 'ugluk');
    await declare(gameId, 'aragorn');
    await nextPhase(gameId);
    const optionOfFirst = await foeAttacks(first);
    const optionOfSecond = await foeAttacks(second);
    expect((await parry(first, optionOfFirst.id, 60)).status).toBe(200);

    expect((await actionOf(second)).parries[0].parryAvailable).toBe(0);
    expect((await parry(second, optionOfSecond.id, 30)).status).toBe(400);
    expect((await parry(second, optionOfSecond.id, 0)).status).toBe(200);
  });

  it('splits the OB between two foes (V3)', async () => {
    const gameId = await newGame();
    const first = await declare(gameId, 'lurtz');
    const second = await declare(gameId, 'ugluk');
    await declare(gameId, 'aragorn');
    await nextPhase(gameId);
    const optionOfFirst = await foeAttacks(first);
    const optionOfSecond = await foeAttacks(second);
    expect((await parry(first, optionOfFirst.id, 30)).status).toBe(200);
    expect((await actionOf(second)).parries[0].parryAvailable).toBe(30);
    expect((await parry(second, optionOfSecond.id, 40)).status).toBe(400);
    expect((await parry(second, optionOfSecond.id, 30, { maneuverResult: 'success' })).status).toBe(200);
    expect(await obOf(gameId, 'aragorn')).toBe(0);
  });

  it('is replaced when it is declared again, and keeps what it had to choose from', async () => {
    const gameId = await newGame();
    const foe = await declare(gameId, 'lurtz');
    await declare(gameId, 'aragorn');
    await nextPhase(gameId);
    const option = await foeAttacks(foe);
    expect((await parry(foe, option.id, 50)).status).toBe(200);
    expect(await obOf(gameId, 'aragorn')).toBe(10);
    const again = await parry(foe, option.id, 20);
    expect(again.status).toBe(200);
    expect((again.body as ActionBody).parries[0].parryAvailable).toBe(60);
    expect(await obOf(gameId, 'aragorn')).toBe(40);
    expect((await parry(foe, option.id, 0)).status).toBe(200);
    expect(await obOf(gameId, 'aragorn')).toBe(60);
  });

  it('is not spent twice when the attack is applied', async () => {
    const gameId = await newGame();
    const foe = await declare(gameId, 'lurtz');
    await declare(gameId, 'aragorn');
    await nextPhase(gameId);
    const option = await foeAttacks(foe);
    expect((await parry(foe, option.id, 20)).status).toBe(200);
    expect((await roll(foe)).status).toBe(200);
    expect((await as('owner').patch(`/v1/actions/${foe}/attack/apply`)).status).toBe(200);

    const round = await roundOf(gameId, 'aragorn');
    expect(round.boReservations).toEqual([]);
    expect(round.parries).toEqual([20]);
    expect(await obOf(gameId, 'aragorn')).toBe(40);
  });

  it('is given back when the attack of the foe is deleted', async () => {
    const gameId = await newGame();
    const foe = await declare(gameId, 'lurtz');
    await declare(gameId, 'aragorn');
    await nextPhase(gameId);
    const option = await foeAttacks(foe);
    expect((await parry(foe, option.id, 20)).status).toBe(200);
    expect((await as('owner').delete(`/v1/actions/${foe}`)).status).toBeLessThan(300);
    expect(await obOf(gameId, 'aragorn')).toBe(60);
  });

  it('is given back when the attack of the foe is prepared again, also on another target', async () => {
    const gameId = await newGame();
    const foe = await declare(gameId, 'lurtz');
    await declare(gameId, 'aragorn');
    await nextPhase(gameId);
    const option = await foeAttacks(foe);
    expect((await parry(foe, option.id, 20)).status).toBe(200);
    expect((await prepare(foe, 'aragorn', 60)).status).toBe(200);
    expect(await obOf(gameId, 'aragorn')).toBe(60);

    const other = await foeAttacks(foe);
    expect((await parry(foe, other.id, 20)).status).toBe(200);
    expect(await obOf(gameId, 'aragorn')).toBe(40);
    expect((await prepare(foe, 'aragorn', 999)).status).toBe(400);
    expect(await obOf(gameId, 'aragorn')).toBe(40);
    expect((await prepare(foe, 'ugluk', 60)).status).toBe(200);
    expect(await obOf(gameId, 'aragorn')).toBe(60);
  });

  it('gives the other pending parries the OB back', async () => {
    const gameId = await newGame();
    const first = await declare(gameId, 'lurtz');
    const second = await declare(gameId, 'ugluk');
    await declare(gameId, 'aragorn');
    await nextPhase(gameId);
    const option = await foeAttacks(first);
    await foeAttacks(second);
    expect((await parry(first, option.id, 60)).status).toBe(200);
    expect((await as('owner').delete(`/v1/actions/${first}`)).status).toBeLessThan(300);
    expect((await actionOf(second)).parries[0].parryAvailable).toBe(60);
  });
});

describe('an attack counts from when it is rolled', () => {
  const rolled = async (gameId: string, foe: string, own: string, bo: number) => {
    await nextPhase(gameId);
    const option = await foeAttacks(foe);
    expect((await prepare(own, 'lurtz', bo)).status).toBe(200);
    expect((await as('owner').patch(`/v1/actions/${own}/attack/parry`, { parries: [] })).status).toBe(200);
    expect(await obOf(gameId, 'aragorn')).toBe(60);
    expect((await roll(own)).status).toBe(200);
    return option;
  };

  it('leaves no parry after attacking with all the OB (V2)', async () => {
    const gameId = await newGame();
    const foe = await declare(gameId, 'lurtz');
    const own = await declare(gameId, 'aragorn');
    const option = await rolled(gameId, foe, own, 60);

    expect(await obOf(gameId, 'aragorn')).toBe(0);
    expect((await actionOf(foe)).parries[0].parryAvailable).toBe(0);
    expect((await parry(foe, option.id, 40)).status).toBe(400);
  });

  it('does not count twice when it rolls again or is applied', async () => {
    const gameId = await newGame();
    const foe = await declare(gameId, 'lurtz');
    const own = await declare(gameId, 'aragorn');
    await rolled(gameId, foe, own, 40);
    expect((await roll(own)).status).toBe(200);
    expect(await obOf(gameId, 'aragorn')).toBe(20);
    expect((await as('owner').patch(`/v1/actions/${own}/attack/apply`)).status).toBe(200);
    expect(await obOf(gameId, 'aragorn')).toBe(20);
    expect((await roundOf(gameId, 'aragorn')).boReservations).toEqual([]);
  });

  it('is given back when it is deleted or prepared again', async () => {
    const gameId = await newGame();
    const foe = await declare(gameId, 'lurtz');
    const own = await declare(gameId, 'aragorn');
    await rolled(gameId, foe, own, 40);
    expect((await prepare(own, 'lurtz', 50)).status).toBe(200);
    expect(await obOf(gameId, 'aragorn')).toBe(60);
    expect((await as('owner').patch(`/v1/actions/${own}/attack/parry`, { parries: [] })).status).toBe(200);
    expect((await roll(own)).status).toBe(200);
    expect(await obOf(gameId, 'aragorn')).toBe(10);
    expect((await as('owner').delete(`/v1/actions/${own}`)).status).toBeLessThan(300);
    expect(await obOf(gameId, 'aragorn')).toBe(60);
  });
});

describe('lowering the initiative', () => {
  const lower = (id: string, total: number) => as('owner').patch(`/v1/actor-rounds/${id}/initiative/lower`, { total });

  it('goes down to its value in negative, and never up', async () => {
    const gameId = await newGame();
    const round = await roundOf(gameId, 'aragorn');
    const start = round.initiative.total;
    const lowered = await lower(round.id, start - 5);
    expect(lowered.status).toBe(200);
    expect((lowered.body as RoundBody).initiative).toMatchObject({ total: start - 5, lowered: -5 });

    const raised = await lower(round.id, start - 2);
    expect(raised.status).toBe(400);
    expect(raised.body).toMatchObject({ code: 'err-initiative-lower' });
    expect((await lower(round.id, -start - 1)).status).toBe(400);
    expect((await lower(round.id, -start)).status).toBe(200);
    expect((await roundOf(gameId, 'aragorn')).initiative).toMatchObject({ total: -start, lowered: -2 * start });
  });

  it('is only for the round', async () => {
    const gameId = await newGame();
    const round = await roundOf(gameId, 'aragorn');
    expect((await lower(round.id, round.initiative.total - 5)).status).toBe(200);
    for (let phase = 0; phase < 4; phase++) await nextPhase(gameId);
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
    const next = await roundOf(gameId, 'aragorn', 2);
    expect(next.initiative.lowered ?? null).toBeNull();
    expect((await lower(round.id, round.initiative.total - 20)).status).toBe(400);
  });
});
