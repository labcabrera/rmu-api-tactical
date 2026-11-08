import request from 'supertest';
import { character, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

// Spec 044, fallo 10: the ValidationPipe no longer converts implicitly. Bodies are validated as they come, the paging
// of the query is converted by its DTO, and nested bodies are classes only through @Type.
let e2e: E2eApp;

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
  e2e.world.characters.set('aragorn', character('aragorn'));
  e2e.world.characters.set('lurtz', character('lurtz', { faction: { id: 'faction-2', name: 'Uruk-hai' } }));
});

afterAll(async () => {
  await e2e?.stop();
});

const as = (user: UserName) => ({
  get: (url: string) => request(e2e.server).get(url).set('Authorization', e2e.auth(user)),
  post: (url: string, body: object = {}) => request(e2e.server).post(url).set('Authorization', e2e.auth(user)).send(body),
  patch: (url: string, body: object = {}) => request(e2e.server).patch(url).set('Authorization', e2e.auth(user)).send(body),
});

const gameBody = (overrides: Record<string, unknown> = {}) => ({
  strategicGameId: 'sg-1',
  name: 'Amon Hen',
  factions: ['faction-1', 'faction-2'],
  actors: [
    { id: 'aragorn', type: 'character' },
    { id: 'lurtz', type: 'character' },
  ],
  ...overrides,
});

/** A game in phase 2 of round 1, so an action declared in phase 1 has the AP of an attack. */
const gameInPhase2 = async () => {
  const created = await as('owner').post('/v1/tactical-games', gameBody());
  expect(created.status).toBe(201);
  const gameId = (created.body as { id: string }).id;
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/initiatives/randomize`)).status).toBe(200);
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
  return gameId;
};

interface RoundBody {
  actorId: string;
  fatigue: { accumulator: number; exerted: boolean };
}

const accumulator = async (gameId: string) => {
  const rounds = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==1`);
  return (rounds.body as { content: RoundBody[] }).content.find(round => round.actorId === 'aragorn')!.fatigue;
};

/* Workspace spec 080 (Core Law §5.5): a free movement takes no AP, but running tires. */
describe('free movement fatigue', () => {
  const declare = async (gameId: string) => {
    const body = { gameId, actorId: 'aragorn', actionType: 'movement', phaseStart: 1, freeAction: true };
    const declared = await as('owner').post('/v1/actions', body);
    expect(declared.status).toBe(201);
    return (declared.body as { id: string }).id;
  };
  const resolve = (id: string, pace: string) => {
    const modifiers = { pace, requiredManeuver: false, skillId: null, difficulty: null, customBonus: null };
    return as('owner').patch(`/v1/actions/${id}/movement/resolve`, { modifiers, roll: null });
  };

  it('adds the fatigue of the pace for each phase it spans, with no AP spent', async () => {
    const gameId = await gameInPhase2();
    const id = await declare(gameId);
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
    const resolved = await resolve(id, 'run');
    expect(resolved.status).toBe(200);
    expect(resolved.body).toMatchObject({ actionPoints: 0, phaseStart: 1, phaseEnd: 2 });
    const fatigue = await accumulator(gameId);
    expect(fatigue.accumulator).toBeCloseTo(4.16);
    expect(fatigue.exerted).toBe(true);
  });

  it('adds none at walking pace', async () => {
    const gameId = await gameInPhase2();
    expect((await resolve(await declare(gameId), 'walk')).status).toBe(200);
    expect((await accumulator(gameId)).accumulator).toBe(0);
  });
});

/* Workspace spec 081 (Core Law §8.1-8.2): a normal movement covers 1 BMR per AP, its pace comes from the AP. */
describe('normal movement', () => {
  const declare = async (gameId: string, phaseStart: number) => {
    const body = { gameId, actorId: 'aragorn', actionType: 'movement', phaseStart };
    const declared = await as('owner').post('/v1/actions', body);
    expect(declared.status).toBe(201);
    return (declared.body as { id: string }).id;
  };
  const resolve = (id: string, modifiers: object = {}) =>
    as('owner').patch(`/v1/actions/${id}/movement/resolve`, { modifiers: { requiredManeuver: false, ...modifiers }, roll: null });
  const nextPhase = async (gameId: string) =>
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);

  interface MovementBody {
    actionPoints: number;
    movement: {
      modifiers: { pace: string; backwards?: boolean };
      calculated: { bmr: number; distance: number; paceMultiplier: number | null };
    };
    warnings?: { code: string }[];
  }

  it('covers 1 BMR per AP without a pace, and the round goes from walk to jog', async () => {
    const gameId = await gameInPhase2();
    const first = await resolve(await declare(gameId, 1));
    expect(first.status).toBe(200);
    const walk = first.body as MovementBody;
    expect(walk.movement.modifiers.pace).toBe('walk');
    expect(walk.movement.calculated.paceMultiplier).toBeNull();
    expect(walk.movement.calculated.distance).toBe(walk.movement.calculated.bmr);
    await nextPhase(gameId);
    const second = (await resolve(await declare(gameId, 2))).body as MovementBody;
    expect(second.movement.modifiers.pace).toBe('jog');
  });

  it('a chosen pace caps the distance of the round', async () => {
    const gameId = await gameInPhase2();
    const creep = (await resolve(await declare(gameId, 1), { pace: 'creep' })).body as MovementBody;
    expect(creep.movement.modifiers.pace).toBe('creep');
    expect(creep.movement.calculated.distance).toBe(creep.movement.calculated.bmr / 2);
    await nextPhase(gameId);
    // The round has covered what creeping does: the actor has to choose a faster pace.
    const second = await declare(gameId, 2);
    const again = await resolve(second, { pace: 'creep' });
    expect(again.status).toBe(400);
    expect((again.body as { code: string }).code).toBe('err-movement-pace-reached');
    expect((await resolve(second, { pace: 'gallop' })).status).toBe(400);
    const walk = (await resolve(second, { pace: 'walk' })).body as MovementBody;
    expect(walk.movement.modifiers.pace).toBe('walk');
    expect(walk.movement.calculated.distance).toBe(walk.movement.calculated.bmr / 2);
  });

  it('halves the distance moving backwards', async () => {
    const gameId = await gameInPhase2();
    const body = (await resolve(await declare(gameId, 1), { backwards: true })).body as MovementBody;
    expect(body.movement.modifiers.backwards).toBe(true);
    expect(body.movement.calculated.distance).toBe(body.movement.calculated.bmr);
    expect(body.movement.calculated.distance).toBeGreaterThan(0);
  });

  it('a dash needs the previous phase, and leaves the AP of the round to movement', async () => {
    const gameId = await gameInPhase2();
    const early = await resolve(await declare(gameId, 1), { pace: 'dash' });
    expect(early.status).toBe(400);
    expect(early.body).toMatchObject({ code: 'err-dash-requirements', details: { reason: 'previous-phase' } });
    expect((await resolve((await declared(gameId)).id)).status).toBe(200);
    await nextPhase(gameId);
    const dash = (await resolve(await declare(gameId, 2), { pace: 'dash' })).body as MovementBody;
    expect(dash.movement.modifiers.pace).toBe('dash');
    expect(dash.movement.calculated.paceMultiplier).toBe(1.25);
    expect(dash.movement.calculated.distance).toBe(dash.movement.calculated.bmr * 1.25);
    await nextPhase(gameId);
    const attack = await as('owner').post('/v1/actions', { gameId, actorId: 'aragorn', actionType: 'melee_attack', phaseStart: 3 });
    expect(attack.status).toBe(400);
    expect(attack.body).toMatchObject({ code: 'err-dash-requirements', details: { reason: 'dash-taken' } });
    const again = await resolve(await declare(gameId, 3), { pace: 'dash' });
    expect(again.body).toMatchObject({ code: 'err-dash-requirements', details: { reason: 'instant-used' } });
  });

  it('warns when a normal and a free movement go past a dash in one phase', async () => {
    const gameId = await gameInPhase2();
    const free = await as('owner').post('/v1/actions', {
      gameId,
      actorId: 'aragorn',
      actionType: 'movement',
      phaseStart: 1,
      freeAction: true,
    });
    const run = await resolve((free.body as { id: string }).id, { pace: 'run' });
    expect(run.status).toBe(200);
    const normal = (await resolve(await declare(gameId, 1))).body as MovementBody;
    expect(normal.warnings?.map(warning => warning.code)).toContain('movement-phase-over-dash');
  });

  it('cuts a movement at the limit of the round, and rejects one with nothing left (decision 7)', async () => {
    e2e.world.characters.set('frodo', character('frodo', { movement: { baseMovementRate: 20, maxPace: 'creep' } }));
    const created = await as('owner').post('/v1/tactical-games', gameBody({ actors: [{ id: 'frodo', type: 'character' }] }));
    const gameId = (created.body as { id: string }).id;
    await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`);
    await as('owner').post(`/v1/tactical-games/${gameId}/initiatives/randomize`);
    await nextPhase(gameId);
    const move = async (phaseStart: number) => {
      const action = await as('owner').post('/v1/actions', { gameId, actorId: 'frodo', actionType: 'movement', phaseStart });
      return resolve((action.body as { id: string }).id);
    };
    const cut = (await move(1)).body as MovementBody;
    expect(cut.movement.calculated.distance).toBe(10);
    expect(cut.warnings?.map(warning => warning.code)).toContain('movement-round-limit');
    await nextPhase(gameId);
    const none = await move(2);
    expect(none.status).toBe(400);
    expect(none.body).toMatchObject({ code: 'err-movement-round-limit', details: { limit: 10, moved: 10 } });
  });

  const declared = async (gameId: string) => {
    const actions = await as('owner').get(`/v1/actions?q=gameId==${gameId};actorId==aragorn;status==declared`);
    return (actions.body as { content: { id: string }[] }).content[0];
  };
});
