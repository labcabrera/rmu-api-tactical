import request from 'supertest';
import { AttackTableEntry } from '../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { CriticalEffect, CriticalResult } from '../../src/modules/actions/domain/value-objects/critical-result.vo.js';
import { character, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

/* Workspace spec 077, block D: falls, falling objects and critical alerts. Table entries and criticals are made up. */

type HazardBody = {
  kind: string;
  attackTable: string;
  ob: number;
  db: number;
  total: number;
  damage: number;
  severity: string | null;
  criticals: { criticalSeverity: string; roll: number | null; alertId: string | null }[];
};

type ActorRoundBody = {
  id: string;
  actorId: string;
  height: number | null;
  hp: { current: number };
  hazards: HazardBody[];
  alerts: { id: string; type: string; status: string; modifiers: { key: string; value: number | null; modifier: string | null }[] }[];
  hpLog: { kind: string; amount: number }[];
};

let e2e: E2eApp;

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
  e2e.world.characters.set('gimli', character('gimli', { info: { raceName: 'Dwarf', raceId: 'dwarf', sizeId: 'medium', height: 5 } }));
  e2e.world.characters.set('legolas', character('legolas', { owner: USERS.other.sub }));
});

afterAll(async () => {
  await e2e?.stop();
});

const as = (user: UserName) => ({
  get: (url: string) => request(e2e.server).get(url).set('Authorization', e2e.auth(user)),
  post: (url: string, body: object = {}) => request(e2e.server).post(url).set('Authorization', e2e.auth(user)).send(body),
});

const startedGame = async () => {
  const created = await as('owner').post('/v1/tactical-games', {
    strategicGameId: 'sg-1',
    name: 'Cliffs',
    factions: ['faction-1'],
    actors: [
      { id: 'gimli', type: 'character' },
      { id: 'legolas', type: 'character' },
    ],
  });
  expect(created.status).toBe(201);
  const gameId = (created.body as { id: string }).id;
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
  const page = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==1`);
  const rounds = (page.body as { content: ActorRoundBody[] }).content;
  return { gameId, gimli: rounds.find(each => each.actorId === 'gimli')!, legolas: rounds.find(each => each.actorId === 'legolas')! };
};

describe('POST /v1/actor-rounds/:id/hazards', () => {
  beforeEach(() => {
    e2e.world.attackEntry = new AttackTableEntry('10CI', 10, 'I', 'C');
    e2e.world.critical = new CriticalResult('Crushed knee.', 4, 'leg', []);
  });

  it('copies the height of the character and resolves a deliberate fall with its criticals as alerts', async () => {
    const { gimli } = await startedGame();
    expect(gimli.height).toBe(5);
    const response = await as('owner').post(`/v1/actor-rounds/${gimli.id}/hazards`, {
      kind: 'fall',
      distanceFeet: 20,
      roll: 50,
      deliberate: true,
    });
    expect(response.status).toBe(200);
    const body = response.body as ActorRoundBody;
    expect(body.hazards[0]).toMatchObject({ kind: 'fall', attackTable: 'crush', ob: 15, db: 0, total: 65, damage: 10, severity: 'C' });
    const alert = body.alerts.find(each => each.type === 'critical')!;
    expect(alert.modifiers).toEqual(expect.arrayContaining([expect.objectContaining({ key: 'origin', modifier: 'hazard' })]));
    expect(body.hazards[0].criticals[0]).toMatchObject({ criticalSeverity: 'C', roll: null, alertId: alert.id });
    expect(body.hpLog).toContainEqual(expect.objectContaining({ kind: 'hazard', amount: -10 }));
  });

  it('applies the criticals rolled with a falling object', async () => {
    const { gimli } = await startedGame();
    const response = await as('owner').post(`/v1/actor-rounds/${gimli.id}/hazards`, {
      kind: 'falling-object',
      distanceFeet: 30,
      roll: 40,
      objectSize: 'huge',
      criticalRolls: [50, 20],
    });
    expect(response.status).toBe(200);
    const body = response.body as ActorRoundBody;
    expect(body.hazards[0]).toMatchObject({ attackTable: 'crush', ob: 30, severity: 'F' });
    expect(body.hazards[0].criticals.map(each => each.roll)).toEqual([50, 20]);
    expect(body.alerts.filter(each => each.type === 'critical')).toHaveLength(0);
    expect(body.hp.current).toBe(50 - 30 - 4 - 4);
  });

  it('is only for the game master, and validates the distance and the fall control', async () => {
    const { legolas } = await startedGame();
    expect((await as('other').post(`/v1/actor-rounds/${legolas.id}/hazards`, { kind: 'fall', distanceFeet: 10, roll: 50 })).status).toBe(
      403,
    );
    const zero = await as('owner').post(`/v1/actor-rounds/${legolas.id}/hazards`, { kind: 'fall', distanceFeet: 0, roll: 50 });
    expect(zero.status).toBe(400);
    expect((zero.body as { code: string }).code).toBe('err-hazard-invalid-distance');
    const control = await as('owner').post(`/v1/actor-rounds/${legolas.id}/hazards`, {
      kind: 'fall',
      distanceFeet: 10,
      roll: 50,
      fallControlActionId: 'missing',
    });
    expect(control.status).toBe(400);
    expect((control.body as { code: string }).code).toBe('err-fall-control-invalid');
    expect((await as('owner').post(`/v1/actor-rounds/${legolas.id}/hazards`, { kind: 'flood', distanceFeet: 10, roll: 50 })).status).toBe(
      400,
    );
  });
});

describe('POST /v1/actor-rounds/:id/alerts/:alertId/critical-roll', () => {
  beforeEach(() => {
    e2e.world.attackEntry = new AttackTableEntry('10CI', 10, 'I', 'C');
    e2e.world.critical = new CriticalResult('Crushed knee.', 4, 'leg', []);
  });

  it('rolls the critical of a hazard alert, applies it and closes the alert', async () => {
    const { gimli } = await startedGame();
    const fall = await as('owner').post(`/v1/actor-rounds/${gimli.id}/hazards`, { kind: 'fall', distanceFeet: 10, roll: 60 });
    const alert = (fall.body as ActorRoundBody).alerts.find(each => each.type === 'critical')!;
    const response = await as('owner').post(`/v1/actor-rounds/${gimli.id}/alerts/${alert.id}/critical-roll`, { roll: 33 });
    expect(response.status).toBe(200);
    const body = response.body as ActorRoundBody & { lastCriticalRoll: { criticalKey: string; damage: number } };
    expect(body.lastCriticalRoll).toMatchObject({ criticalKey: 'I-C-33', damage: 4 });
    expect(body.alerts.find(each => each.id === alert.id)?.status).toBe('resolved');
    expect(body.hazards[0].criticals[0]).toMatchObject({ roll: 33 });
    expect(body.hp.current).toBe(50 - 10 - 4);
    const again = await as('owner').post(`/v1/actor-rounds/${gimli.id}/alerts/${alert.id}/critical-roll`, { roll: 33 });
    expect(again.status).toBe(400);
    expect((again.body as { code: string }).code).toBe('err-alert-not-resolvable');
    expect((await as('owner').post(`/v1/actor-rounds/${gimli.id}/alerts/${alert.id}/critical-roll`, { roll: 101 })).status).toBe(400);
  });
});

describe('workspace spec 079, A4: knocked back', () => {
  it('raises a knocked-back alert from the critical and caps the hazard that resolves it', async () => {
    e2e.world.attackEntry = new AttackTableEntry('10CI', 10, 'I', 'C');
    e2e.world.critical = new CriticalResult('Sent flying.', 2, 'chest', [
      new CriticalEffect('knocked_back_distance', undefined, 10, undefined, undefined),
    ]);
    const { gimli } = await startedGame();
    const fall = await as('owner').post(`/v1/actor-rounds/${gimli.id}/hazards`, { kind: 'fall', distanceFeet: 10, roll: 60 });
    const critical = (fall.body as ActorRoundBody).alerts.find(each => each.type === 'critical')!;
    const rolled = await as('owner').post(`/v1/actor-rounds/${gimli.id}/alerts/${critical.id}/critical-roll`, { roll: 45 });
    expect(rolled.status).toBe(200);
    const knockedBack = (rolled.body as ActorRoundBody).alerts.find(each => each.type === 'knocked-back')!;
    expect(knockedBack.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'feet', value: 10 }),
        expect.objectContaining({ key: 'severityCap', modifier: 'C' }),
      ]),
    );

    e2e.world.attackEntry = new AttackTableEntry('20EI', 20, 'I', 'E');
    e2e.world.critical = new CriticalResult('Hits the wall.', 3, 'chest', []);
    const hazard = await as('owner').post(`/v1/actor-rounds/${gimli.id}/hazards`, {
      kind: 'falling-object',
      distanceFeet: 10,
      roll: 50,
      objectSize: 'medium',
      knockedBackAlertId: knockedBack.id,
    });
    expect(hazard.status).toBe(200);
    const body = hazard.body as ActorRoundBody & { hazards: (HazardBody & { severityCap: string; knockedBackAlertId: string })[] };
    expect(body.hazards.at(-1)).toMatchObject({ severity: 'C', severityCap: 'C', knockedBackAlertId: knockedBack.id });
    expect(body.alerts.find(each => each.id === knockedBack.id)?.status).toBe('resolved');
    const again = await as('owner').post(`/v1/actor-rounds/${gimli.id}/hazards`, {
      kind: 'fall',
      distanceFeet: 10,
      roll: 50,
      knockedBackAlertId: knockedBack.id,
    });
    expect(again.status).toBe(400);
    expect(again.body).toMatchObject({ code: 'err-alert-not-resolvable' });
  });

  it('dismisses a knocked-back alert by hand, and rejects an unknown outcome', async () => {
    e2e.world.attackEntry = new AttackTableEntry('10CI', 10, 'I', 'C');
    e2e.world.critical = new CriticalResult('Sent flying.', 2, 'chest', [
      new CriticalEffect('knocked_back_distance', undefined, 5, undefined, undefined),
    ]);
    const { legolas } = await startedGame();
    const fall = await as('owner').post(`/v1/actor-rounds/${legolas.id}/hazards`, {
      kind: 'fall',
      distanceFeet: 10,
      roll: 60,
      criticalRolls: [45],
    });
    const knockedBack = (fall.body as ActorRoundBody).alerts.find(each => each.type === 'knocked-back')!;
    expect((await as('owner').post(`/v1/actor-rounds/${legolas.id}/alerts/${knockedBack.id}/resolve`, { outcome: 'maybe' })).status).toBe(
      400,
    );
    const resolved = await as('owner').post(`/v1/actor-rounds/${legolas.id}/alerts/${knockedBack.id}/resolve`, {});
    expect(resolved.status).toBe(200);
    expect((resolved.body as ActorRoundBody).alerts.find(each => each.id === knockedBack.id)?.status).toBe('resolved');
  });
});
