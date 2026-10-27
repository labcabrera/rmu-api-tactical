import request from 'supertest';
import { character, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

type ActorRoundBody = { id: string; actorId: string; factionId: string; effects: { id: string; status: string }[] };

let e2e: E2eApp;

const as = (user: UserName) => ({
  get: (url: string) => request(e2e.server).get(url).set('Authorization', e2e.auth(user)),
  post: (url: string, body: object = {}) => request(e2e.server).post(url).set('Authorization', e2e.auth(user)).send(body),
  patch: (url: string, body: object = {}) => request(e2e.server).patch(url).set('Authorization', e2e.auth(user)).send(body),
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

describe('physical RR of a frenzy-dying actor (workspace spec 040)', () => {
  it('kills the actor when it fails, at attack level 0', async () => {
    e2e.world.characters.set('frodo', character('frodo', { resistances: [{ resistance: 'physical', totalBonus: 10 }] }));
    try {
      const { rounds } = await startedGame();
      const url = `/v1/actor-rounds/${rounds.frodo.id}`;
      const effects = async () => ((await as('owner').get(url)).body as ActorRoundBody).effects.map(e => e.status);
      expect((await as('owner').post(`${url}/effects`, { status: 'frenzy' })).status).toBeLessThan(300);
      // 50 hits and a death threshold of 50 (no Body Development in the fixture): -60 is beyond it.
      expect((await as('owner').patch(`${url}/hp`, { dmg: 110 })).status).toBe(200);
      expect(await effects()).toEqual(expect.arrayContaining(['frenzy-dying', 'unconscious']));

      const resisted = await as('owner').post(`${url}/resistance-rolls`, {
        kind: 'physical',
        attackLevel: 7,
        roll: 60,
        reason: 'frenzy-dying',
      });
      expect(resisted.status).toBe(200);
      expect(resisted.body).toMatchObject({ kind: 'physical', attackLevel: 0, total: 70, resisted: true });
      expect(await effects()).not.toContain('dead');

      const failed = await as('owner').post(`${url}/resistance-rolls`, {
        kind: 'physical',
        attackLevel: 0,
        roll: 5,
        reason: 'frenzy-dying',
      });
      expect(failed.body).toMatchObject({ resisted: false });
      expect(await effects()).toContain('dead');
    } finally {
      e2e.world.characters.set('frodo', character('frodo', { resistances: [{ resistance: 'fear', totalBonus: 10 }] }));
    }
  });
});

describe('group checks (workspace spec 022, decisions 9 and 10)', () => {
  const group = { actorIds: ['frodo'] };
  const leader = { actorId: 'sam', leadershipRanks: 0, leadershipBonus: 0 };

  it('frightens, keeps the routed actor from attacking, reads the morale and rallies', async () => {
    const { gameId, rounds } = await startedGame();
    const fear = await as('owner').post(`/v1/tactical-games/${gameId}/fear-checks`, {
      frightLevel: 10,
      group,
      leader,
      rolls: { frodo: 20 },
    });
    expect(fear.status).toBe(200);
    expect(fear.body).toMatchObject({
      kind: 'fear',
      frightLevel: 10,
      leader: { actorId: 'sam', actorRoundId: rounds.sam.id, recognized: true, fearRrBonus: 0 },
      actors: [{ actorId: 'frodo', status: 'afraid', total: 0, failure: 60, effect: 'fear-routed', restrictions: ['no-attacks'] }],
    });
    const written = (fear.body as { actorRounds: ActorRoundBody[] }).actorRounds;
    expect(written[0].effects.map(each => each.status)).toContain('fear-routed');

    expect((await as('owner').post(`/v1/tactical-games/${gameId}/initiatives/randomize`)).status).toBe(200);
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
    const attack = await as('owner').post('/v1/actions', { gameId, actorId: 'frodo', actionType: 'melee_attack', phaseStart: 1 });
    expect(attack.status).toBe(400);
    expect(attack.body).toMatchObject({ code: 'err-action-fear' });

    const morale = await as('owner').post(`/v1/tactical-games/${gameId}/morale-checks`, { group, leader, roll: 100 });
    expect(morale.status).toBe(200);
    expect(morale.body).toMatchObject({ kind: 'morale', outcome: 'obeys', leaderRoll: { total: 110, result: 'success' }, actorRounds: [] });

    const rally = await as('owner').post(`/v1/tactical-games/${gameId}/rally-checks`, { group, leader, roll: 150 });
    expect(rally.status).toBe(200);
    expect(rally.body).toMatchObject({
      kind: 'rally',
      fearSeverityChange: -2,
      leaderRoll: { total: 105, result: 'success' },
      actors: [{ actorId: 'frodo', previousEffect: 'fear-routed', effect: 'fear-balk', restrictions: [] }],
    });
  });

  it('validates the body and lets only game managers check', async () => {
    const { gameId } = await startedGame();
    const url = `/v1/tactical-games/${gameId}/fear-checks`;
    expect((await as('owner').post(url, { frightLevel: -1, group })).status).toBe(400);
    expect((await as('owner').post(url, { group })).body).toMatchObject({ code: 'err-fright-level-required' });
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/rally-checks`, { group })).status).toBe(400);
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/rally-checks`, { group, leader, roll: 50 })).body).toMatchObject({
      code: 'err-rally-nobody-afraid',
    });
    expect((await as('other').post(url, { frightLevel: 1, group })).status).toBe(403);
    expect((await as('owner').post('/v1/tactical-games/missing/morale-checks', { leader })).status).toBe(404);
  });
});
