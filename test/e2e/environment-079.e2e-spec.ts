import request from 'supertest';
import { character, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

type Alert = { id: string; type: string; status: string; modifiers?: { key: string; value?: number | null; modifier?: string | null }[] };
type ActorRoundBody = {
  id: string;
  actorId: string;
  round: number;
  hp: { max: number; current: number };
  effects: { id: string; status: string; value?: number; rounds?: number }[];
  alerts: Alert[];
  hazards: { kind: string; attackTable: string | null; severity: string | null; temperature: object | null; criticals: object[] }[];
  breath: { sinceRound: number; prepared: boolean; limitRounds: number; heldRounds: number; constitutionSource: string } | null;
  protectedFromEnvironment: boolean;
};

let e2e: E2eApp;

const as = (user: UserName) => ({
  get: (url: string) => request(e2e.server).get(url).set('Authorization', e2e.auth(user)),
  post: (url: string, body: object = {}) => request(e2e.server).post(url).set('Authorization', e2e.auth(user)).send(body),
  patch: (url: string, body: object = {}) => request(e2e.server).patch(url).set('Authorization', e2e.auth(user)).send(body),
  delete: (url: string) => request(e2e.server).delete(url).set('Authorization', e2e.auth(user)),
});

const ok = <T = ActorRoundBody>(response: request.Response, status = 200): T => {
  expect(response.status, JSON.stringify(response.body)).toBe(status);
  return response.body as T;
};

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
});

afterAll(async () => {
  await e2e?.stop();
});

/** A game with Gimli (Co bonus +4) and Legolas, its first round started; their actor rounds by actor id. */
const startGame = async (environment?: object) => {
  e2e.world.characters.set('gimli', character('gimli', { statistics: { co: { totalBonus: 4 } } }));
  e2e.world.characters.set('legolas', character('legolas'));
  const created = await as('owner').post('/v1/tactical-games', {
    strategicGameId: 'sg-1',
    name: 'The Long Lake',
    factions: ['faction-1'],
    actors: [
      { id: 'gimli', type: 'character' },
      { id: 'legolas', type: 'character' },
    ],
    ...(environment ? { environment } : {}),
  });
  const gameId = ok<{ id: string }>(created, 201).id;
  ok(await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`));
  return { gameId, rounds: await roundsOf(gameId, 1) };
};

const roundsOf = async (gameId: string, round: number) => {
  const page = ok<{ content: ActorRoundBody[] }>(await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==${round}`));
  return Object.fromEntries(page.content.map(each => [each.actorId, each]));
};

const nextRound = async (gameId: string, round: number) => {
  ok(await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`));
  return roundsOf(gameId, round);
};

const pending = (round: ActorRoundBody, type: string) => round.alerts.filter(alert => alert.type === type && alert.status === 'pending');
const text = (alert: Alert, key: string) => alert.modifiers?.find(modifier => modifier.key === key)?.modifier;

describe('game environment: fog and extreme temperature (workspace spec 079, C3 and C5)', () => {
  it('stores them, keeps them when a PATCH leaves them out, clears them with null and refuses a mild temperature', async () => {
    const { gameId } = await startGame({ fog: 'heavy', extremeTemperature: { kind: 'cold', temperature: -80 } });
    const game = ok<{ environment: Record<string, unknown> }>(await as('owner').get(`/v1/tactical-games/${gameId}`));
    expect(game.environment).toMatchObject({
      fog: 'heavy',
      extremeTemperature: { kind: 'cold', temperature: -80, criticalType: 'O', criticalSeverity: 'B' },
    });
    const kept = ok<{ environment: Record<string, unknown> }>(
      await as('owner').patch(`/v1/tactical-games/${gameId}`, {
        environment: { temperatureFatigueModifier: -10, altitudeFatigueModifier: 0 },
      }),
    );
    expect(kept.environment).toMatchObject({ temperatureFatigueModifier: -10, fog: 'heavy', extremeTemperature: { temperature: -80 } });
    const wrong = await as('owner').patch(`/v1/tactical-games/${gameId}`, {
      environment: { temperatureFatigueModifier: 0, altitudeFatigueModifier: 0, extremeTemperature: { kind: 'heat', temperature: 30 } },
    });
    expect(wrong.status).toBe(400);
    expect((wrong.body as { code: string }).code).toBe('err-temperature-not-extreme');
    const invalidFog = await as('owner').patch(`/v1/tactical-games/${gameId}`, { environment: { fog: 'pea-soup' } });
    expect(invalidFog.status).toBe(400);
    const cleared = ok<{ environment: Record<string, unknown> }>(
      await as('owner').patch(`/v1/tactical-games/${gameId}`, {
        environment: { temperatureFatigueModifier: 0, altitudeFatigueModifier: 0, fog: null, extremeTemperature: null },
      }),
    );
    expect(cleared.environment).toMatchObject({ fog: null, extremeTemperature: null });
  });

  it('the upkeep asks for the critical of the cold for each actor not protected', async () => {
    const { gameId, rounds } = await startGame({ extremeTemperature: { kind: 'cold', temperature: -80 } });
    const sheltered = ok(await as('owner').patch(`/v1/actor-rounds/${rounds.legolas.id}/environment-protection`, { protected: true }));
    expect(sheltered.protectedFromEnvironment).toBe(true);
    expect((await as('other').patch(`/v1/actor-rounds/${rounds.gimli.id}/environment-protection`, { protected: true })).status).toBe(403);
    const second = await nextRound(gameId, 2);
    const critical = pending(second.gimli, 'critical');
    expect(critical).toHaveLength(1);
    expect([text(critical[0], 'origin'), text(critical[0], 'criticalType'), text(critical[0], 'criticalSeverity')]).toEqual([
      'environment',
      'O',
      'B',
    ]);
    expect(pending(second.legolas, 'critical')).toHaveLength(0);
    expect(second.legolas.protectedFromEnvironment).toBe(true);
    // Rolled like any critical alert
    const rolled = ok(await as('owner').post(`/v1/actor-rounds/${second.gimli.id}/alerts/${critical[0].id}/critical-roll`, { roll: 50 }));
    expect(pending(rolled, 'critical')).toHaveLength(0);
    expect(rolled.hp.current).toBeLessThan(second.gimli.hp.current);
  });
});

describe('hazard of an extreme temperature (workspace spec 079, C3)', () => {
  it('a critical of steam from its temperature, without an attack roll; a mild one is refused', async () => {
    const { rounds } = await startGame();
    const body = ok(
      await as('owner').post(`/v1/actor-rounds/${rounds.gimli.id}/hazards`, {
        kind: 'extreme-temperature',
        temperatureKind: 'steam',
        temperature: 180,
      }),
    );
    expect(body.hazards[0]).toMatchObject({
      kind: 'extreme-temperature',
      attackTable: null,
      severity: 'B',
      temperature: { kind: 'steam', celsius: 180, criticalType: 'steam', severitySource: 'table' },
    });
    const alert = pending(body, 'critical')[0];
    expect([text(alert, 'origin'), text(alert, 'criticalType'), text(alert, 'criticalSeverity')]).toEqual(['hazard', 'steam', 'B']);
    const given = ok(
      await as('owner').post(`/v1/actor-rounds/${rounds.gimli.id}/hazards`, {
        kind: 'extreme-temperature',
        temperatureKind: 'heat',
        severity: 'A',
        criticalRolls: [40],
      }),
    );
    expect(given.hazards[1]).toMatchObject({ severity: 'A', temperature: { criticalType: 'H', severitySource: 'given' } });
    const mild = await as('owner').post(`/v1/actor-rounds/${rounds.gimli.id}/hazards`, { kind: 'extreme-temperature', temperature: 25 });
    expect(mild.status).toBe(400);
    expect((mild.body as { code: string }).code).toBe('err-temperature-not-extreme');
  });
});

describe('held breath and suffocation (workspace spec 079, C4)', () => {
  it('holds the breath with the Co bonus of the sheet; past the limit a breath check; a failure suffocates; breathing ends it', async () => {
    const { gameId, rounds } = await startGame();
    // Unprepared: the Co bonus alone, 4 rounds
    const started = ok(await as('owner').post(`/v1/actor-rounds/${rounds.gimli.id}/breath`, { prepared: false, underwater: true }));
    expect(started.breath).toMatchObject({ sinceRound: 1, prepared: false, limitRounds: 4, heldRounds: 1, constitutionSource: 'sheet' });
    expect((await as('owner').post(`/v1/actor-rounds/${rounds.gimli.id}/breath`, {})).status).toBe(400);
    expect((await as('other').post(`/v1/actor-rounds/${rounds.legolas.id}/breath`, {})).status).toBe(403);
    let current = rounds;
    for (let round = 2; round <= 5; round++) {
      current = await nextRound(gameId, round);
      expect(current.gimli.breath?.heldRounds).toBe(round);
    }
    // Round 4 ended at the limit: no check yet; round 5 is the first one past it
    expect(pending(current.gimli, 'breath-check')).toHaveLength(0);
    current = await nextRound(gameId, 6);
    const check = pending(current.gimli, 'breath-check');
    expect(check).toHaveLength(1);
    expect(text(check[0], 'difficulty')).toBe('e');
    const noOutcome = await as('owner').post(`/v1/actor-rounds/${current.gimli.id}/alerts/${check[0].id}/resolve`, {});
    expect(noOutcome.status).toBe(400);
    const failed = ok(await as('owner').post(`/v1/actor-rounds/${current.gimli.id}/alerts/${check[0].id}/resolve`, { outcome: 'failed' }));
    expect(failed.effects.map(effect => effect.status)).toEqual(expect.arrayContaining(['suffocating', 'stunned']));
    const suffocating = await nextRound(gameId, 7);
    expect(suffocating.gimli.hp.current).toBeLessThan(failed.hp.current);
    expect(pending(suffocating.gimli, 'breath-check')).toHaveLength(0);
    const breathing = ok(await as('owner').delete(`/v1/actor-rounds/${suffocating.gimli.id}/breath`));
    expect(breathing.breath).toBeNull();
    expect(breathing.effects.map(effect => effect.status)).not.toContain('suffocating');
    expect((await as('owner').delete(`/v1/actor-rounds/${suffocating.gimli.id}/breath`)).status).toBe(400);
  });
});
