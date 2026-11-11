import request from 'supertest';
import { character, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

/*
 * Workspace spec 079, block B: similar and complementary skills, feats of strength, adrenal moves and Fortitude.
 * Invented characters and numbers; the fake maneuver table answers success above 100 and failure below.
 */

type Entry = { key: string; value: number; group?: string; source?: string; rule?: string; params?: Record<string, unknown> };
type RoundBody = { id: string; actorId: string; effects: { status: string; value?: number; rounds?: number; fromRound?: number }[] };

let e2e: E2eApp;

const skill = (skillId: string, ranks: number, totalBonus: number) => ({ skillId, specialization: null, ranks, totalBonus });

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
  e2e.world.characters.set(
    'boromir',
    character('boromir', {
      info: { raceName: 'Human', raceId: 'human', sizeId: 'medium', weight: 200 },
      statistics: { st: { totalBonus: 3 } },
      skills: [
        skill('weight-training', 4, 20),
        skill('adrenal-focus', 5, 30),
        skill('fortitude', 3, 20),
        skill('perception', 6, 40),
        skill('traps', 4, 10),
      ],
    }),
  );
  e2e.world.characters.set('sam', character('sam', { skills: [skill('traps', 6, 25)] }));
});

afterAll(async () => {
  await e2e?.stop();
});

const as = (user: UserName) => ({
  get: (url: string) => request(e2e.server).get(url).set('Authorization', e2e.auth(user)),
  post: (url: string, body: object = {}) => request(e2e.server).post(url).set('Authorization', e2e.auth(user)).send(body),
  patch: (url: string, body: object = {}) => request(e2e.server).patch(url).set('Authorization', e2e.auth(user)).send(body),
});

const gameInPhase1 = async () => {
  const created = await as('owner').post('/v1/tactical-games', {
    strategicGameId: 'sg-1',
    name: 'Caradhras',
    description: 'The pass',
    factions: ['faction-1'],
    actors: [
      { id: 'boromir', type: 'character' },
      { id: 'sam', type: 'character' },
    ],
  });
  expect(created.status).toBe(201);
  const gameId = (created.body as { id: string }).id;
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/initiatives/randomize`)).status).toBe(200);
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
  return gameId;
};

const declare = async (gameId: string, skillId: string, extra: object = {}) => {
  const declared = await as('owner').post('/v1/actions', {
    gameId,
    actorId: 'boromir',
    actionType: 'maneuver',
    phaseStart: 1,
    maneuver: { skillId },
    ...extra,
  });
  expect(declared.status).toBe(201);
  return (declared.body as { id: string }).id;
};

const boromirRound = async (gameId: string) => {
  const rounds = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==1`);
  return (rounds.body as { content: RoundBody[] }).content.find(round => round.actorId === 'boromir')!;
};

type ManeuverBody = { maneuver: { modifiers: Record<string, unknown>; result: Record<string, unknown>; roll: { modifiers: Entry[] } } };

describe('feats of strength (§5.2)', () => {
  it('lists the difficulty of the load and resolves with it', async () => {
    const gameId = await gameInPhase1();
    const actionId = await declare(gameId, 'weight-training');
    const listing = await as('owner').get(
      `/v1/actions/${actionId}/maneuver/modifiers?purpose=feat-of-strength&loadWeight=150&mechanicalFactor=1`,
    );
    expect(listing.status).toBe(200);
    // 150 / 200 = 75 %, less 2 × 3 = 69 %: Hard.
    expect(listing.body).toMatchObject({
      featOfStrength: {
        bodyWeight: 200,
        strengthBonus: 3,
        weightMultiplier: 1,
        result: { percent: 75, adjustedPercent: 69, difficulty: 'h' },
      },
    });

    const resolved = await as('owner').patch(`/v1/actions/${actionId}/maneuver/resolve`, {
      roll: { roll: 50 },
      purpose: 'feat-of-strength',
      featOfStrength: { loadWeight: 150 },
    });
    expect(resolved.status).toBe(200);
    const maneuver = (resolved.body as ManeuverBody).maneuver;
    expect(maneuver.result).toMatchObject({ featOfStrength: { difficulty: 'h', adjustedPercent: 69 } });
    expect(maneuver.modifiers).toMatchObject({ featOfStrength: { loadWeight: 150 } });
    expect(maneuver.roll.modifiers.find(entry => entry.source === 'feat-of-strength')).toMatchObject({ rule: '§5.2, Table 5-2' });
  });

  it('rejects a feat of strength with another skill or without a load', async () => {
    const gameId = await gameInPhase1();
    const other = await declare(gameId, 'perception');
    const wrong = await as('owner').patch(`/v1/actions/${other}/maneuver/resolve`, {
      roll: { roll: 50 },
      purpose: 'feat-of-strength',
      featOfStrength: { loadWeight: 150 },
    });
    expect(wrong.status).toBe(400);
    expect(wrong.body).toMatchObject({ code: 'err-feat-of-strength-invalid' });
    const actionId = await declare(await gameInPhase1(), 'weight-training');
    const missing = await as('owner').patch(`/v1/actions/${actionId}/maneuver/resolve`, {
      roll: { roll: 50 },
      purpose: 'feat-of-strength',
    });
    expect(missing.status).toBe(400);
  });
});

describe('similar and complementary skills (ch. 3)', () => {
  it('lists the aids and adds them to the roll', async () => {
    const gameId = await gameInPhase1();
    const actionId = await declare(gameId, 'perception');
    const listing = await as('owner').get(
      `/v1/actions/${actionId}/maneuver/modifiers?similarTo=search&similarity=-25&complementary=sam:traps:,boromir:traps:`,
    );
    expect(listing.status).toBe(200);
    const aids = (listing.body as { aids: Entry[] }).aids;
    // The fake catalog puts every skill in one category: same category, -50.
    expect(aids.map(entry => [entry.key, entry.value])).toEqual([
      ['similar-skill-relation', -50],
      ['similar-skill-similarity', -25],
      ['complementary-skill', 6],
      ['complementary-skill', 2],
    ]);

    const resolved = await as('owner').patch(`/v1/actions/${actionId}/maneuver/resolve`, {
      roll: { roll: 50 },
      similarity: { targetSkillId: 'search', similarity: -25, relation: 'same-skill' },
      complementary: [{ actorId: 'sam', skillId: 'traps' }],
    });
    expect(resolved.status).toBe(200);
    const maneuver = (resolved.body as ManeuverBody).maneuver;
    expect(maneuver.modifiers).toMatchObject({ similarity: { targetSkillId: 'search', relation: 'same-skill' } });
    const keys = maneuver.roll.modifiers.map(entry => [entry.key, entry.value]);
    expect(keys).toContainEqual(['similar-skill-relation', -25]);
    expect(keys).toContainEqual(['complementary-skill', 6]);
    expect(maneuver.roll.modifiers.find(entry => entry.key === 'similar-skill-relation')).toMatchObject({
      rule: 'Table 3-0c',
      params: { overridden: true },
    });
  });

  it('rejects a helper outside the game and a bad query', async () => {
    const gameId = await gameInPhase1();
    const actionId = await declare(gameId, 'perception');
    const stranger = await as('owner').patch(`/v1/actions/${actionId}/maneuver/resolve`, {
      roll: { roll: 50 },
      complementary: [{ actorId: 'gollum', skillId: 'traps' }],
    });
    expect(stranger.status).toBe(404);
    const bad = await as('owner').get(`/v1/actions/${actionId}/maneuver/modifiers?similarTo=search&similarity=-30`);
    expect(bad.status).toBe(400);
  });
});

describe('adrenal moves and Fortitude (§3.4, §3.6)', () => {
  it('an Adrenal Focus success gives its bonus from the next round', async () => {
    const gameId = await gameInPhase1();
    const actionId = await declare(gameId, 'adrenal-focus');
    // 95 + 30 = 125: success, 2 rounds.
    const resolved = await as('owner').patch(`/v1/actions/${actionId}/maneuver/resolve`, { roll: { roll: 95 }, purpose: 'adrenal' });
    expect(resolved.status).toBe(200);
    expect((resolved.body as ManeuverBody).maneuver.result).toMatchObject({ adrenal: { kind: 'focus', rounds: 2, fromRound: 2 } });
    expect((await boromirRound(gameId)).effects).toContainEqual(
      expect.objectContaining({ status: 'adrenal-focus', value: 25, rounds: 2, fromRound: 2 }),
    );
  });

  it('rejects an adrenal move with a skill that is not adrenal', async () => {
    const gameId = await gameInPhase1();
    const actionId = await declare(gameId, 'perception');
    const response = await as('owner').patch(`/v1/actions/${actionId}/maneuver/resolve`, { roll: { roll: 95 }, purpose: 'adrenal' });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'err-adrenal-invalid' });
  });

  it('Fortitude is instantaneous and halves the penalties at once', async () => {
    const gameId = await gameInPhase1();
    const slow = await declare(gameId, 'fortitude');
    const rejected = await as('owner').patch(`/v1/actions/${slow}/maneuver/resolve`, { roll: { roll: 95 }, purpose: 'fortitude' });
    expect(rejected.status).toBe(400);
    expect(rejected.body).toMatchObject({ code: 'err-adrenal-invalid', details: { reason: 'not-instantaneous' } });

    const actionId = await declare(gameId, 'fortitude', { freeAction: true });
    const resolved = await as('owner').patch(`/v1/actions/${actionId}/maneuver/resolve`, { roll: { roll: 95 }, purpose: 'fortitude' });
    expect(resolved.status).toBe(200);
    expect((resolved.body as ManeuverBody).maneuver.result).toMatchObject({ adrenal: { kind: 'fortitude', rounds: 1 } });
    expect((await boromirRound(gameId)).effects).toContainEqual(expect.objectContaining({ status: 'fortitude', value: 50 }));
  });
});
