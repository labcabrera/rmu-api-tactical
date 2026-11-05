import request from 'supertest';
import { character, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

type Alert = { id: string; type: string; status: string; modifiers?: { key: string; value?: number | null; modifier?: string | null }[] };
type ActorRoundBody = {
  id: string;
  actorId: string;
  round: number;
  hp: { max: number; current: number };
  effects: { id: string; status: string; rounds?: number }[];
  injuries: { id: string; type: string; penalty: number; tourniquet?: object | null }[];
  alerts: Alert[];
  lostLimbs: { location: string; side: string; cause?: string; injuryId?: string }[];
  deathRound: number | null;
  soulRoundsLeft: number | null;
};
type Body = Record<string, unknown> & { actorRound: ActorRoundBody };

let e2e: E2eApp;

const as = (user: UserName) => ({
  get: (url: string) => request(e2e.server).get(url).set('Authorization', e2e.auth(user)),
  post: (url: string, body: object = {}) => request(e2e.server).post(url).set('Authorization', e2e.auth(user)).send(body),
});

// Made-up wounds: never the rows of the book.
const wound = (id: string, overrides: object = {}) => ({
  id,
  type: 'cut-burn',
  severity: 'medium',
  location: 'leg',
  side: 'left',
  penalty: -20,
  initialPenalty: -20,
  bleeding: 3,
  source: { kind: 'critical' },
  treatments: [],
  status: 'active',
  createdAt: '2026-11-05T00:00:00.000Z',
  ...overrides,
});

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
});

afterAll(async () => {
  await e2e?.stop();
});

/** A game with Gimli and his wounds, its first round started; his actor round. */
const gimliRound = async (injuries: object[] = [wound('cut')]) => {
  e2e.world.characters.set('gimli', character('gimli', { injuries } as never));
  const created = await as('owner').post('/v1/tactical-games', {
    strategicGameId: 'sg-1',
    name: 'Helm Deep',
    factions: ['faction-1'],
    actors: [{ id: 'gimli', type: 'character' }],
  });
  expect(created.status).toBe(201);
  const gameId = (created.body as { id: string }).id;
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
  const page = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==1`);
  return { gameId, round: (page.body as { content: ActorRoundBody[] }).content[0] };
};

const ok = (response: request.Response, status = 200) => {
  expect(response.status, JSON.stringify(response.body)).toBe(status);
  return response.body as Body;
};

const healer = { healer: { name: 'Surgeon', bonus: 50 } };

describe('emergency amputation and lost limbs (workspace spec 079, C1)', () => {
  it('amputates at -30: the limb is lost, its bleeding ends, the stump is four -40 injuries and the pace is creep', async () => {
    const { round } = await gimliRound();
    const body = ok(
      await as('owner').post(`/v1/actor-rounds/${round.id}/amputations`, {
        ...healer,
        roll: 90,
        location: 'leg',
        side: 'left',
        injuryId: 'cut',
      }),
    );
    // The e2e maneuver port: success above 100
    expect(body).toMatchObject({ result: 'success', difficulty: -30, total: 110 });
    expect(body.breakdown).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'difficulty', value: -30, rule: '§13.1' })]));
    expect(body.lostLimb).toMatchObject({ location: 'leg', side: 'left', cause: 'amputation', injuryId: 'cut' });
    const stump = body.actorRound.injuries.filter(injury => (body.injuryIds as string[]).includes(injury.id));
    expect(stump.map(injury => [injury.type, injury.penalty])).toEqual([
      ['bone', -40],
      ['muscle-tendon', -40],
      ['skin-tissue', -40],
      ['cut-burn', -40],
    ]);
    expect(body.actorRound.lostLimbs).toHaveLength(1);
    expect(body.criticalAlertId).toBeUndefined();

    const twice = await as('owner').post(`/v1/actor-rounds/${round.id}/amputations`, {
      ...healer,
      roll: 90,
      location: 'leg',
      side: 'left',
    });
    expect(twice.status).toBe(400);
    expect((twice.body as { code: string }).code).toBe('err-limb-already-lost');
  });

  it('a failed amputation leaves the critical of the stump as an alert', async () => {
    const { round } = await gimliRound([]);
    const body = ok(
      await as('owner').post(`/v1/actor-rounds/${round.id}/amputations`, { ...healer, roll: 20, location: 'arm', side: 'right' }),
    );
    expect(body.result).toBe('failure');
    const alert = body.actorRound.alerts.find(each => each.id === body.criticalAlertId)!;
    expect(alert.type).toBe('critical');
    expect(alert.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'origin', modifier: 'amputation' }),
        expect.objectContaining({ key: 'resultShift', value: -1 }),
      ]),
    );
  });

  it('validates the limb', async () => {
    const { round } = await gimliRound([]);
    expect(
      (await as('owner').post(`/v1/actor-rounds/${round.id}/amputations`, { ...healer, roll: 20, location: 'head', side: 'right' })).status,
    ).toBe(400);
    expect((await as('owner').post(`/v1/actor-rounds/${round.id}/amputations`, { ...healer, roll: 20, location: 'arm' })).status).toBe(400);
  });

  it('the game outcome carries the lost limbs to strategic', async () => {
    const { gameId, round } = await gimliRound([]);
    const amputated = ok(
      await as('owner').post(`/v1/actor-rounds/${round.id}/amputations`, { ...healer, roll: 90, location: 'arm', side: 'left' }),
    );
    expect(amputated.actorRound.lostLimbs).toHaveLength(1);
    ok(await as('owner').post(`/v1/tactical-games/${gameId}/finish`, { fates: [] }));
    ok(await as('owner').post(`/v1/tactical-games/${gameId}/apply`));
    const applied = e2e.world.outcomes.find(each => each.request.tacticalGameId === gameId)!;
    expect(applied.request.lostLimbs).toEqual([expect.objectContaining({ location: 'arm', side: 'left', cause: 'amputation' })]);
  });
});

describe('death and revival (workspace spec 079, C6)', () => {
  const kill = async (roundId: string) => ok(await as('owner').post(`/v1/actor-rounds/${roundId}/effects`, { status: 'dead' }), 201);

  it('keeps the round of the death and the rounds left before the soul departs', async () => {
    const { round } = await gimliRound([]);
    expect(round).toMatchObject({ deathRound: null, soulRoundsLeft: null });
    const dead = (await kill(round.id)) as unknown as ActorRoundBody;
    expect(dead).toMatchObject({ deathRound: 1, soulRoundsLeft: 60 });
  });

  it('revives a dead body with a cardiac massage at -100: it becomes unconscious', async () => {
    const { round } = await gimliRound([]);
    await kill(round.id);
    const body = ok(await as('owner').post(`/v1/actor-rounds/${round.id}/revive`, { ...healer, roll: 160, method: 'cardiac' }));
    expect(body).toMatchObject({ result: 'success', difficulty: -100, total: 110, revived: true });
    expect(body.actorRound.effects.map(each => each.status)).toContain('unconscious');
    expect(body.actorRound.effects.map(each => each.status)).not.toContain('dead');
    expect(body.actorRound.deathRound).toBeNull();
  });

  it('a dangerous defibrillation that fails shocks the body: an L critical alert and its hits', async () => {
    const { round } = await gimliRound([]);
    await kill(round.id);
    const body = ok(
      await as('owner').post(`/v1/actor-rounds/${round.id}/revive`, {
        ...healer,
        roll: 20,
        method: 'defibrillation',
        defibrillationDifficulty: -40,
        dangerousSource: true,
        shockHitsRoll: 10,
      }),
    );
    expect(body).toMatchObject({ result: 'failure', difficulty: -40, revived: false, shock: { criticalSeverity: 'C', hits: 10 } });
    expect(body.actorRound.hp.current).toBe(40);
  });

  it('refuses the living, a defibrillation out of range and an unknown method', async () => {
    const { round } = await gimliRound([]);
    const living = await as('owner').post(`/v1/actor-rounds/${round.id}/revive`, { ...healer, roll: 90, method: 'respiratory' });
    expect(living.status).toBe(400);
    expect((living.body as { code: string }).code).toBe('err-revive-not-dead');
    await kill(round.id);
    const range = await as('owner').post(`/v1/actor-rounds/${round.id}/revive`, {
      ...healer,
      roll: 90,
      method: 'defibrillation',
      defibrillationDifficulty: -90,
    });
    expect((range.body as { code: string }).code).toBe('err-revive-invalid-difficulty');
    expect((await as('owner').post(`/v1/actor-rounds/${round.id}/revive`, { ...healer, roll: 90, method: 'prayer' })).status).toBe(400);
  });
});
