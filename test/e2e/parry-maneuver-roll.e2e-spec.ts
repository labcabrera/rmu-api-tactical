import request from 'supertest';
import { AttackTableEntry } from '../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { character, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

/* Workspace spec 084: the Combat Training maneuver of a parry against a further foe comes from a roll. */
let e2e: E2eApp;

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
  const [mainHand] = character('aragorn').attacks;
  e2e.world.characters.set(
    'aragorn',
    character('aragorn', {
      attacks: [{ ...mainHand, skillId: 'melee-weapon@blade' }],
      skills: [{ skillId: 'melee-weapon', specialization: 'blade', totalBonus: 45, ranks: 10 }],
    }),
  );
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
});

interface Parry {
  id: string;
  parry: number;
  maneuverSkill?: number;
  parryManeuver: { required: boolean; foes: number; result: string | null; passed: boolean | null; total?: number } | null;
}

const start = async () => {
  const created = await as('owner').post('/v1/tactical-games', {
    strategicGameId: 'sg-1',
    name: 'Helm',
    factions: ['faction-1', 'faction-2'],
    actors: ['aragorn', 'lurtz', 'ugluk'].map(id => ({ id, type: 'character' })),
  });
  const gameId = (created.body as { id: string }).id;
  await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`);
  await as('owner').post(`/v1/tactical-games/${gameId}/initiatives/randomize`);
  await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`);
  const declare = async (actorId: string) =>
    ((await as('owner').post('/v1/actions', { gameId, actorId, actionType: 'melee_attack', phaseStart: 1 })).body as { id: string }).id;
  const first = await declare('lurtz');
  const second = await declare('ugluk');
  await declare('aragorn');
  await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`);
  const prepare = async (id: string) =>
    (
      (
        await as('owner').patch(`/v1/actions/${id}/attack/prepare`, {
          attacks: [{ attackName: 'mainHand', modifiers: { targetId: 'aragorn', bo: 60 }, protectors: null }],
        })
      ).body as { parries: Parry[] }
    ).parries[0];
  return { gameId, first, second, prepare };
};

const parry = (id: string, item: object) => as('owner').patch(`/v1/actions/${id}/attack/parry`, { parries: [item] });
const parriesOf = async (id: string) => ((await as('owner').get(`/v1/actions/${id}`)).body as { parries: Parry[] }).parries;

describe('the maneuver of a further foe', () => {
  it('asks for it when two foes prepared before the first parry', async () => {
    const { first, second, prepare } = await start();
    const toFirst = await prepare(first);
    const toSecond = await prepare(second);
    expect(toSecond.parryManeuver).toBeNull();
    expect(toSecond.maneuverSkill).toBe(45);

    expect((await parry(first, { parryId: toFirst.id, parry: 20 })).status).toBe(200);

    expect((await parriesOf(second))[0].parryManeuver).toEqual({ required: true, foes: 1, result: null, passed: null });
    const missing = await parry(second, { parryId: toSecond.id, parry: 20 });
    expect(missing.status).toBe(400);
    expect(missing.body).toMatchObject({ code: 'err-parry-maneuver-required' });
  });

  it('adds up the roll, the skill and the difficulty: from 101 it passes', async () => {
    const { first, second, prepare } = await start();
    const toFirst = await prepare(first);
    expect((await parry(first, { parryId: toFirst.id, parry: 20 })).status).toBe(200);
    const toSecond = await prepare(second);

    const passed = await parry(second, { parryId: toSecond.id, parry: 20, maneuverRoll: 60 });
    expect(passed.status).toBe(200);
    expect((passed.body as { parries: Parry[] }).parries[0]).toMatchObject({
      parry: 20,
      parryManeuver: { roll: 60, difficulty: 'm', penalty: 0, total: 105, result: 'success', passed: true, manual: false },
    });
  });

  it('takes no OB when it fails', async () => {
    const { gameId, first, second, prepare } = await start();
    const toFirst = await prepare(first);
    expect((await parry(first, { parryId: toFirst.id, parry: 20 })).status).toBe(200);
    const toSecond = await prepare(second);

    const failed = await parry(second, { parryId: toSecond.id, parry: 20, maneuverRoll: 40 });
    expect(failed.status).toBe(200);
    expect((failed.body as { parries: Parry[] }).parries[0]).toMatchObject({
      parry: 0,
      parryManeuver: { total: 85, result: 'failure', passed: false },
    });
    const rounds = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==1;actorId==aragorn`);
    const [round] = (rounds.body as { content: { parries: number[] }[] }).content;
    expect(round.parries).toEqual([20]);
  });

  it('still lets the game master give the result without a roll', async () => {
    const { first, second, prepare } = await start();
    const toFirst = await prepare(first);
    expect((await parry(first, { parryId: toFirst.id, parry: 20 })).status).toBe(200);
    const toSecond = await prepare(second);

    const given = await parry(second, { parryId: toSecond.id, parry: 20, maneuverResult: 'success' });
    expect((given.body as { parries: Parry[] }).parries[0]).toMatchObject({
      parry: 20,
      parryManeuver: { result: 'success', passed: true, manual: true, roll: null },
    });
  });

  it('rejects a roll for the first foe', async () => {
    const { first, prepare } = await start();
    const toFirst = await prepare(first);
    const rolled = await parry(first, { parryId: toFirst.id, parry: 20, maneuverRoll: 60 });
    expect(rolled.status).toBe(400);
    expect(rolled.body).toMatchObject({ code: 'err-parry-maneuver-not-needed' });
  });
});
