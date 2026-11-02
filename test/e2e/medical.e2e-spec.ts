import request from 'supertest';
import type { StrategicItem } from '../../src/modules/strategic/application/ports/item.port.js';
import { HEALING_COMBAT_RULES } from '../fixtures/healing-tables.js';
import { character, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

type Injury = {
  id: string;
  bleeding?: number;
  bleedingControl?: string;
  reopenOn?: string | null;
  treatments: { procedure: string; result: string; note?: string }[];
  treatmentInProgress?: { actionId: string; procedure: string; result: string; rounds: number } | null;
};
type ActorRoundBody = {
  id: string;
  actorId: string;
  round: number;
  hp: { max: number; current: number };
  effects: { id: string; status: string; rounds?: number }[];
  injuries: Injury[];
  alerts: { type: string; status: string }[];
  itemsConsumed: { itemId: string; amount: number }[];
};
type ActionBody = {
  id: string;
  status: string;
  actionType: string;
  round: number;
  actionPoints: number;
  carriedAp: number | null;
  continuesActionId: string | null;
  apProfile: { min: number; max: number };
  warnings: { code: string; requiresConfirm: boolean }[];
  medical: {
    procedure: string;
    rounds: number;
    state: string;
    resolvedSteps: number;
    originActionId: string;
    results: { step: number; result?: string; breakdown?: { key: string; value: number; rule?: string }[]; roundsGained?: number }[];
  } | null;
  useItem: { itemId: string; targetActorId: string; result?: { healed: number } | null } | null;
};
type ErrorBody = { code: string; details?: { warnings?: { code: string }[]; state?: string } };

let e2e: E2eApp;

const as = (user: UserName) => ({
  get: (url: string) => request(e2e.server).get(url).set('Authorization', e2e.auth(user)),
  post: (url: string, body: object = {}) => request(e2e.server).post(url).set('Authorization', e2e.auth(user)).send(body),
  patch: (url: string, body: object = {}) => request(e2e.server).patch(url).set('Authorization', e2e.auth(user)).send(body),
  delete: (url: string) => request(e2e.server).delete(url).set('Authorization', e2e.auth(user)),
});

// Made-up wounds and herbs (workspace spec 068): never the rows of the book.
const wound = (id: string, bleeding: number, overrides: object = {}) => ({
  id,
  type: 'cut-burn',
  severity: 'light',
  location: 'arm',
  penalty: -10,
  initialPenalty: -10,
  bleeding,
  source: { kind: 'critical' },
  treatments: [],
  status: 'active',
  createdAt: '2026-11-01T00:00:00.000Z',
  ...overrides,
});

const herb = (id: string, characterId: string): StrategicItem => ({
  id,
  characterId,
  itemTypeId: `e2e-${id}`,
  name: `E2E ${id}`,
  category: 'herb',
  carried: true,
  weapon: null,
  armor: null,
  shield: null,
  amount: 2,
  catalog: { features: { herb: { group: 'e2e', magical: false, effects: { heal: { min: 3, max: 3 }, stunRelief: null } } } },
});

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
  e2e.world.characters.set('elrond', character('elrond'));
  e2e.world.items.set('elrond', [herb('e2e-leaf', 'elrond')]);
  e2e.world.healingCombatRules = HEALING_COMBAT_RULES;
});

afterAll(async () => {
  await e2e?.stop();
});

/** A game with Elrond (the healer) and the patient with its wounds, in phase 1 of round 1. */
const gameInPhase1 = async (patientInjuries: object[] = [wound('cut', 1)]) => {
  e2e.world.characters.set('frodo', character('frodo', { injuries: patientInjuries } as never));
  const created = await as('owner').post('/v1/tactical-games', {
    strategicGameId: 'sg-1',
    name: 'Ford of Bruinen',
    factions: ['faction-1'],
    actors: [
      { id: 'elrond', type: 'character' },
      { id: 'frodo', type: 'character' },
    ],
  });
  expect(created.status).toBe(201);
  const gameId = (created.body as { id: string }).id;
  await startRound(gameId);
  return gameId;
};

const startRound = async (gameId: string) => {
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/initiatives/randomize`)).status).toBe(200);
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
};

const nextPhases = async (gameId: string, phases: number) => {
  for (let i = 0; i < phases; i++) {
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
  }
};

const actorRound = async (gameId: string, actorId: string, round: number) => {
  const page = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};actorId==${actorId};round==${round}`);
  return (page.body as { content: ActorRoundBody[] }).content[0];
};

const declareMedical = (gameId: string, medical: object, extra: object = {}) =>
  as('owner').post('/v1/actions', { gameId, actorId: 'elrond', actionType: 'medical', phaseStart: 1, medical, ...extra });

describe('medical actions (workspace spec 068)', () => {
  it('holds pressure for its rounds of 4 AP: no bleeding while held, then the wound is controlled', async () => {
    const gameId = await gameInPhase1();
    const declared = await declareMedical(gameId, { patientActorId: 'frodo', injuryId: 'cut', procedure: 'pressure', roll: 120 });
    expect(declared.status).toBe(201);
    const action = declared.body as ActionBody;
    // Made-up duration: 2 rounds per point of bleeding
    expect(action).toMatchObject({ apProfile: { min: 4, max: 4 }, medical: { procedure: 'pressure', rounds: 2, state: 'pending' } });

    const early = await as('owner').patch(`/v1/actions/${action.id}/medical/resolve`, {});
    expect(early.status).toBe(400);
    expect((early.body as ErrorBody).code).toBe('err-action-points-below-min');

    await nextPhases(gameId, 3);
    const first = await as('owner').patch(`/v1/actions/${action.id}/medical/resolve`, {});
    expect(first.status).toBe(200);
    const started = first.body as ActionBody;
    expect(started).toMatchObject({ status: 'declared', medical: { state: 'in-progress', resolvedSteps: 1 } });
    expect(started.medical!.results[0]).toMatchObject({ step: 1, result: 'success' });
    expect(started.medical!.results[0].breakdown!.map(each => each.key)).toEqual(['roll', 'medicine', 'difficulty', 'rounds']);
    const held = (await actorRound(gameId, 'frodo', 1)).injuries[0];
    expect(held).toMatchObject({ bleedingControl: 'pressure', treatmentInProgress: { actionId: action.id, procedure: 'pressure' } });

    const again = await as('owner').patch(`/v1/actions/${action.id}/medical/resolve`, {});
    expect(again.status).toBe(400);
    expect((again.body as ErrorBody).code).toBe('err-medical-already-resolved');

    // The upkeep does not take the bleeding while the pressure is held, and the action goes on in round 2
    await nextPhases(gameId, 1);
    await startRound(gameId);
    expect((await actorRound(gameId, 'frodo', 2)).hp.current).toBe(50);
    const page = await as('owner').get(`/v1/actions?q=gameId==${gameId};round==2`);
    const continuation = (page.body as { content: ActionBody[] }).content.find(each => each.actionType === 'medical')!;
    expect(continuation).toMatchObject({ continuesActionId: action.id, carriedAp: 4, medical: { originActionId: action.id } });

    await nextPhases(gameId, 3);
    const last = await as('owner').patch(`/v1/actions/${continuation.id}/medical/resolve`, {});
    expect(last.status).toBe(200);
    expect(last.body).toMatchObject({ status: 'completed', medical: { state: 'completed', resolvedSteps: 2 } });
    const treated = (await actorRound(gameId, 'frodo', 2)).injuries[0];
    expect(treated.treatmentInProgress ?? null).toBeNull();
    expect(treated.treatments.map(each => each.procedure)).toEqual(['pressure']);
    expect(treated.reopenOn).toBe('exertion');

    // Decision 5: the patient exerts itself, after a confirmation, and the wound bleeds again
    const attack = { gameId, actorId: 'frodo', actionType: 'melee_attack', phaseStart: 4 };
    const warned = await as('owner').post('/v1/actions', attack);
    expect(warned.status).toBe(409);
    expect(warned.body).toMatchObject({ code: 'err-action-confirm-required', details: { warnings: [{ code: 'exertion-reopens-wound' }] } });
    expect((await as('owner').post('/v1/actions', { ...attack, confirm: true })).status).toBe(201);
    const reopened = await actorRound(gameId, 'frodo', 2);
    expect(reopened.injuries[0]).toMatchObject({ bleeding: 1, reopenOn: null });
    expect(reopened.alerts.map(alert => alert.type)).toContain('wound-reopened');
  });

  it('interrupts the treatment with another action, after a confirmation: pressure let go bleeds again', async () => {
    const gameId = await gameInPhase1();
    const action = (await declareMedical(gameId, { patientActorId: 'frodo', injuryId: 'cut', procedure: 'pressure', roll: 120 }))
      .body as ActionBody;
    await nextPhases(gameId, 3);
    expect((await as('owner').patch(`/v1/actions/${action.id}/medical/resolve`, {})).status).toBe(200);

    const other = { gameId, actorId: 'elrond', actionType: 'other', phaseStart: 4 };
    const warned = await as('owner').post('/v1/actions', other);
    expect(warned.status).toBe(409);
    expect((warned.body as ErrorBody).details!.warnings!.map(each => each.code)).toEqual(['treatment-interrupted']);
    // The medical action held the AP of the phase: they go to the new action
    expect((await as('owner').post('/v1/actions', { ...other, confirm: true })).status).toBe(201);

    const interrupted = (await as('owner').get(`/v1/actions/${action.id}`)).body as ActionBody;
    expect(interrupted).toMatchObject({ status: 'interrupted', medical: { state: 'aborted' } });
    const patient = await actorRound(gameId, 'frodo', 1);
    expect(patient.injuries[0].bleedingControl ?? null).toBeNull();
    expect(patient.injuries[0].treatmentInProgress ?? null).toBeNull();
    expect(patient.alerts.map(alert => alert.type)).toContain('wound-reopened');
  });

  it('refuses surgery, a missing injury and an unable healer', async () => {
    const gameId = await gameInPhase1();
    const surgery = await declareMedical(gameId, { patientActorId: 'frodo', injuryId: 'cut', procedure: 'surgery' });
    expect([surgery.status, (surgery.body as ErrorBody).code]).toEqual([400, 'err-treatment-not-in-combat']);
    const missing = await declareMedical(gameId, { patientActorId: 'frodo', injuryId: 'nope', procedure: 'dress' });
    expect([missing.status, (missing.body as ErrorBody).code]).toEqual([404, 'err-injury-not-found']);

    const healer = await actorRound(gameId, 'elrond', 1);
    expect((await as('owner').post(`/v1/actor-rounds/${healer.id}/effects`, { status: 'stunned', rounds: 2 })).status).toBe(201);
    const stunned = await declareMedical(gameId, { patientActorId: 'frodo', injuryId: 'cut', procedure: 'dress' });
    expect([stunned.status, (stunned.body as ErrorBody).code]).toEqual([400, 'err-healer-not-able']);
  });

  it('stabilizes a dying patient with a roll in each round', async () => {
    const gameId = await gameInPhase1([]);
    const patient = await actorRound(gameId, 'frodo', 1);
    const added = await as('owner').post(`/v1/actor-rounds/${patient.id}/effects`, { status: 'dying', rounds: 3 });
    expect(added.status).toBe(201);
    const effect = (added.body as ActorRoundBody).effects.find(each => each.status === 'dying')!;

    const action = (await declareMedical(gameId, { patientActorId: 'frodo', effectId: effect.id, procedure: 'stabilize', roll: 120 }))
      .body as ActionBody;
    expect(action.medical).toMatchObject({ procedure: 'stabilize', rounds: 1 });
    await nextPhases(gameId, 3);
    const resolved = await as('owner').patch(`/v1/actions/${action.id}/medical/resolve`, {});
    expect(resolved.status).toBe(200);
    expect(resolved.body).toMatchObject({ status: 'completed', medical: { state: 'completed', results: [{ roundsGained: 1 }] } });
    const dying = (await actorRound(gameId, 'frodo', 1)).effects.find(each => each.status === 'dying');
    expect(dying!.rounds).toBe(4);
  });
});

describe('use_item actions (workspace spec 068)', () => {
  it('uses a healing item of the actor on a target with its 2 AP and records it as consumed', async () => {
    const gameId = await gameInPhase1([]);
    const patient = await actorRound(gameId, 'frodo', 1);
    expect((await as('owner').patch(`/v1/actor-rounds/${patient.id}/hp`, { dmg: 10 })).status).toBe(200);
    const declared = await as('owner').post('/v1/actions', {
      gameId,
      actorId: 'elrond',
      actionType: 'use_item',
      phaseStart: 1,
      useItem: { itemId: 'e2e-leaf', targetActorId: 'frodo' },
    });
    expect(declared.status).toBe(201);
    const action = declared.body as ActionBody;
    expect(action.apProfile).toEqual({ min: 2, max: 2 });

    await nextPhases(gameId, 1);
    const resolved = await as('owner').patch(`/v1/actions/${action.id}/use-item/resolve`, {});
    expect(resolved.status).toBe(200);
    expect(resolved.body).toMatchObject({ status: 'completed', useItem: { result: { healed: 3 } } });
    expect((await actorRound(gameId, 'frodo', 1)).hp.current).toBe(43);
    expect((await actorRound(gameId, 'elrond', 1)).itemsConsumed).toEqual([{ itemId: 'e2e-leaf', amount: 1 }]);
  });

  it('records the herbs of POST herbs as consumed too', async () => {
    const gameId = await gameInPhase1([]);
    const healer = await actorRound(gameId, 'elrond', 1);
    expect((await as('owner').post(`/v1/actor-rounds/${healer.id}/herbs`, { itemId: 'e2e-leaf' })).status).toBe(200);
    expect((await as('owner').post(`/v1/actor-rounds/${healer.id}/herbs`, { itemId: 'e2e-leaf' })).status).toBe(200);
    expect((await actorRound(gameId, 'elrond', 1)).itemsConsumed).toEqual([{ itemId: 'e2e-leaf', amount: 2 }]);
  });
});
