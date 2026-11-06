import request from 'supertest';
import { character, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

/*
 * Workspace spec 079, phase 7 (block D, talents): situational talents of a maneuver, the odour of the target by smell,
 * Breath Holding, Vigorous in the endurance of the round and the Deadeye share of a range. Invented characters and
 * numbers.
 */

type Entry = { key: string; value: number; group?: string; rule?: string; params?: Record<string, unknown> };
type RoundBody = {
  id: string;
  actorId: string;
  fatigue: { endurance: number };
  movement: { penalty: number; dodgePenalty: number };
  attacks: { attackName: string; ranges?: { from: number; to: number; bonus: number; traitBonus?: number }[] }[];
  breath: { limitRounds: number; breathHolding: { rounds: number; inactive: boolean; meditation: boolean } | null } | null;
};
type ManeuverBody = { maneuver: { modifiers: Record<string, unknown>; roll: { modifiers: Entry[] } } };

let e2e: E2eApp;

const skill = (skillId: string, ranks: number, totalBonus: number, specialization: string | null = null) => ({
  skillId,
  specialization,
  ranks,
  totalBonus,
});
const trait = (traitId: string, tier = 1, specialization?: string) => ({ traitId, tier, ...(specialization ? { specialization } : {}) });

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
  e2e.world.characters.set(
    'linnet',
    character('linnet', {
      experience: { level: 4 },
      skills: [skill('influence', 5, 40), skill('perception', 6, 40), skill('tracking', 4, 30), skill('body-development', 5, 30)],
      traits: [trait('golden-throat', 2), trait('breath-holding'), trait('vigorous', 2)],
      endurance: { racialBonus: 0, traitBonus: 20, fatiguePenalty: 0 },
      equipment: {
        slots: {},
        maneuverPenalty: -5,
        encumbrancePenalty: -5,
        dodgeEncumbrancePenalty: -15,
        movementBaseDifficulty: 'm',
      },
      attacks: [
        {
          attackName: 'mainHand',
          attackTable: 'short-bow',
          sizeAdjustment: 0,
          fumble: 3,
          bo: 50,
          type: 'ranged',
          meleeRange: null,
          ranges: [
            { from: 0, to: 30, bonus: 0, traitBonus: 10 },
            { from: 30, to: 90, bonus: -5, traitBonus: 20 },
          ],
          fumbleTable: 'ranged',
          skillId: 'ranged-weapon@bow',
        },
      ],
    } as never),
  );
  e2e.world.characters.set('fox', character('fox', { traits: [trait('neutral-odor')] }));
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
    name: 'Reedmarsh',
    factions: ['faction-1'],
    actors: [
      { id: 'linnet', type: 'character' },
      { id: 'fox', type: 'character' },
    ],
  });
  expect(created.status, JSON.stringify(created.body)).toBe(201);
  const gameId = (created.body as { id: string }).id;
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/initiatives/randomize`)).status).toBe(200);
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
  return gameId;
};

const roundOf = async (gameId: string, actorId: string) => {
  const rounds = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==1`);
  return (rounds.body as { content: RoundBody[] }).content.find(round => round.actorId === actorId)!;
};

const declare = async (gameId: string, skillId: string) => {
  const declared = await as('owner').post('/v1/actions', {
    gameId,
    actorId: 'linnet',
    actionType: 'maneuver',
    phaseStart: 1,
    maneuver: { skillId },
  });
  expect(declared.status, JSON.stringify(declared.body)).toBe(201);
  return (declared.body as { id: string }).id;
};

describe('talents in a tactical game (spec 079, block D)', () => {
  it('brings Vigorous, the dodge penalty and the Deadeye share of the sheet into the actor round', async () => {
    const gameId = await gameInPhase1();
    const linnet = await roundOf(gameId, 'linnet');
    expect(linnet.fatigue.endurance).toBe(50);
    expect(linnet.movement).toMatchObject({ penalty: -10, dodgePenalty: -20 });
    expect(linnet.attacks[0].ranges![1]).toEqual({ from: 30, to: 90, bonus: -5, traitBonus: 20 });
  });

  it('lists the situational talents and adds the ticked ones to the roll (D3)', async () => {
    const gameId = await gameInPhase1();
    const actionId = await declare(gameId, 'influence');
    const listing = await as('owner').get(`/v1/actions/${actionId}/maneuver/modifiers`);
    expect(listing.status).toBe(200);
    expect((listing.body as { situationalTraits: object[] }).situationalTraits).toEqual([
      expect.objectContaining({ traitId: 'golden-throat', value: 20, tier: 2, condition: 'calm-or-persuade', mode: 'ticked' }),
    ]);

    const wrong = await as('owner').patch(`/v1/actions/${actionId}/maneuver/resolve`, {
      roll: { roll: 50 },
      situationalTraits: ['empathy'],
    });
    expect(wrong.status).toBe(400);
    expect(wrong.body).toMatchObject({ code: 'err-maneuver-situational-trait' });

    const resolved = await as('owner').patch(`/v1/actions/${actionId}/maneuver/resolve`, {
      roll: { roll: 50 },
      situationalTraits: ['golden-throat'],
    });
    expect(resolved.status, JSON.stringify(resolved.body)).toBe(200);
    const maneuver = (resolved.body as ManeuverBody).maneuver;
    expect(maneuver.modifiers).toMatchObject({ situationalTraits: ['golden-throat'] });
    expect(maneuver.roll.modifiers.find(entry => entry.key === 'situational-golden-throat')).toMatchObject({
      value: 20,
      group: 'talent',
      rule: 'Core Law ch. 4',
    });
  });

  it('reads the Neutral Odor of the target of a tracking by smell (D3)', async () => {
    const gameId = await gameInPhase1();
    const actionId = await declare(gameId, 'tracking');
    const resolved = await as('owner').patch(`/v1/actions/${actionId}/maneuver/resolve`, {
      roll: { roll: 50 },
      sense: 'smell',
      senseTargetActorId: 'fox',
    });
    expect(resolved.status, JSON.stringify(resolved.body)).toBe(200);
    const maneuver = (resolved.body as ManeuverBody).maneuver;
    expect(maneuver.roll.modifiers.find(entry => entry.key === 'target-neutral-odor')).toMatchObject({ value: -50 });
    expect(maneuver.modifiers).toMatchObject({ senseTargetActorId: 'fox' });
  });

  it('holds the breath 12 rounds per level with Breath Holding, three times with Meditation (D5)', async () => {
    const gameId = await gameInPhase1();
    const linnet = await roundOf(gameId, 'linnet');
    const started = await as('owner').post(`/v1/actor-rounds/${linnet.id}/breath`, { meditation: true });
    expect(started.status, JSON.stringify(started.body)).toBe(200);
    expect((started.body as RoundBody).breath).toMatchObject({
      limitRounds: 144,
      breathHolding: { rounds: 144, level: 4, inactive: true, meditation: true },
    });
    const fox = await roundOf(gameId, 'fox');
    const plain = await as('owner').post(`/v1/actor-rounds/${fox.id}/breath`, { meditation: true });
    expect((plain.body as RoundBody).breath).toMatchObject({ limitRounds: 12, breathHolding: null });
  });
});
