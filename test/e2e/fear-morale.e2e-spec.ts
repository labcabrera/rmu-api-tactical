import request from 'supertest';
import { HEALING_COMBAT_RULES } from '../fixtures/healing-tables.js';
import { character, npc, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

type ActorRoundBody = {
  id: string;
  actorId: string;
  actorType: string;
  round: number;
  hp: { max: number; current: number };
  effects: { id: string; status: string }[];
  injuries: { id: string; bleeding?: number; flags?: string[]; tourniquet?: { tightSince: number; loosenedAt: number | null } | null }[];
  alerts: { type: string; status: string; modifiers?: { key: string; value?: number | null; modifier?: string | null }[] }[];
  items: { itemId: string; slot?: string; dropped?: boolean }[];
  temporaryModifiers: { id: string; kind: string; value: number }[];
  frightLevel: number | null;
};
type ErrorBody = { code: string; details?: { state?: string; pace?: string; limit?: string } };

let e2e: E2eApp;

const as = (user: UserName) => ({
  get: (url: string) => request(e2e.server).get(url).set('Authorization', e2e.auth(user)),
  post: (url: string, body: object = {}) => request(e2e.server).post(url).set('Authorization', e2e.auth(user)).send(body),
  patch: (url: string, body: object = {}) => request(e2e.server).patch(url).set('Authorization', e2e.auth(user)).send(body),
  delete: (url: string) => request(e2e.server).delete(url).set('Authorization', e2e.auth(user)),
});

// Made-up wounds, NPCs and modifiers (workspace spec 068): never the rows of the book.
const wound = (id: string, overrides: object = {}) => ({
  id,
  type: 'bone',
  severity: 'medium',
  location: 'leg',
  penalty: -20,
  initialPenalty: -20,
  source: { kind: 'critical' },
  treatments: [],
  status: 'active',
  createdAt: '2026-11-01T00:00:00.000Z',
  ...overrides,
});

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null, realmId: 'realm-1' });
  e2e.world.realms.set('realm-core', { id: 'realm-core', name: 'Core', generic: true });
  e2e.world.npcs.set('shade', npc('shade', { name: 'Shade', realmId: 'realm-core', frightLevel: 6 }));
  e2e.world.healingCombatRules = HEALING_COMBAT_RULES;
  e2e.world.characters.set(
    'merry',
    character('merry', {
      equipment: { slots: { mainHand: 'sword' }, maneuverPenalty: 0, encumbrancePenalty: 0, movementBaseDifficulty: 'm' },
      temporaryModifiers: [
        { id: 'tm-1', kind: 'fear-rr', value: 10, source: 'manual', days: 3, createdAt: '2026-10-30T00:00:00.000Z', tacticalGameId: null },
      ],
    } as never),
  );
  e2e.world.items.set('merry', [
    {
      id: 'sword',
      characterId: 'merry',
      itemTypeId: 'sword',
      name: 'sword',
      category: 'weapon',
      carried: true,
      weapon: {},
      armor: null,
      shield: null,
      info: { strength: 80, stackable: false },
    },
  ]);
  e2e.world.characters.set('pippin', character('pippin', { owner: USERS.other.sub }));
});

afterAll(async () => {
  await e2e?.stop();
});

const createGame = async (actors: string[], extra: object = {}) => {
  const created = await as('owner').post('/v1/tactical-games', {
    strategicGameId: 'sg-1',
    name: 'Barrow-downs',
    factions: ['faction-1'],
    actors: actors.map(id => ({ id, type: 'character' })),
    ...extra,
  });
  expect(created.status).toBe(201);
  const gameId = (created.body as { id: string }).id;
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
  return gameId;
};

const roundsOf = async (gameId: string, round = 1) =>
  ((await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==${round}`)).body as { content: ActorRoundBody[] }).content;

describe('fear effects and fright levels (workspace spec 068)', () => {
  it('applies the result of an individual fear RR keeping the worst state', async () => {
    const gameId = await createGame(['merry']);
    const [merry] = await roundsOf(gameId);
    const severe = await as('owner').post(`/v1/actor-rounds/${merry.id}/fear-effects`, { severity: 'severe', source: { name: 'Wight' } });
    expect(severe.status).toBe(200);
    expect(severe.body).toMatchObject({ fearState: 'routed', unchanged: false, effect: { status: 'fear-routed' } });
    const mild = await as('owner').post(`/v1/actor-rounds/${merry.id}/fear-effects`, { severity: 'mild' });
    expect(mild.body).toMatchObject({ fearState: 'balk', unchanged: true, effect: { status: 'fear-routed' } });
    expect((await as('owner').post(`/v1/actor-rounds/${merry.id}/fear-effects`, { severity: 'awful' })).status).toBe(400);

    // Routed: only movement, dodge or 0 AP
    await as('owner').post(`/v1/tactical-games/${gameId}/initiatives/randomize`);
    await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`);
    const maneuver = await as('owner').post('/v1/actions', {
      gameId,
      actorId: 'merry',
      actionType: 'other',
      phaseStart: 1,
    });
    expect([maneuver.status, (maneuver.body as ErrorBody).code, (maneuver.body as ErrorBody).details]).toEqual([
      400,
      'err-action-fear',
      { state: 'fear-routed' },
    ]);
    // Only a broken actor drops its equipment
    const notBroken = await as('owner').post(`/v1/actor-rounds/${merry.id}/drop-items`);
    expect([notBroken.status, (notBroken.body as ErrorBody).code]).toEqual([400, 'err-action-fear']);
    await as('owner').post(`/v1/actor-rounds/${merry.id}/fear-effects`, { severity: 'extreme' });
    const dropped = await as('owner').post(`/v1/actor-rounds/${merry.id}/drop-items`);
    expect(dropped.status).toBe(200);
    expect((dropped.body as ActorRoundBody).items.find(item => item.itemId === 'sword')).toMatchObject({ dropped: true });
    expect((dropped.body as ActorRoundBody).items.find(item => item.itemId === 'sword')!.slot).toBeUndefined();
  });

  it('serves the fright levels to any participant, and not to a stranger', async () => {
    const gameId = await createGame(['merry', 'pippin']);
    const response = await as('other').get(`/v1/tactical-games/${gameId}/fright-levels`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      frightLevels: [{ key: 'immediate-danger', level: 2 }],
      fallenThresholds: [{ minShare: 0.4, exclusive: false, frightLevel: 3 }, expect.anything(), expect.anything()],
    });
    const solo = await createGame(['merry']);
    expect((await as('other').get(`/v1/tactical-games/${solo}/fright-levels`)).status).toBe(403);
  });

  it('takes the fright level of an NPC to the fear check, and alerts the suggested check once per threshold', async () => {
    const gameId = await createGame(['merry', 'pippin'], { environmentFaction: { name: 'Downs', npcs: [{ npcId: 'shade', count: 1 }] } });
    const rounds = await roundsOf(gameId);
    const shade = rounds.find(each => each.actorType === 'npc')!;
    expect(shade.frightLevel).toBe(6);
    const merry = rounds.find(each => each.actorId === 'merry')!;
    // The modifier of the character comes into the game
    expect(merry.temporaryModifiers).toEqual([expect.objectContaining({ id: 'tm-1', kind: 'fear-rr', value: 10 })]);

    const check = await as('owner').post(`/v1/tactical-games/${gameId}/fear-checks`, {
      group: { actorIds: ['merry'] },
      frightSourceActorId: shade.actorId,
      frightLevelModifier: 3,
      rolls: { merry: 200 },
    });
    expect(check.status).toBe(200);
    expect(check.body).toMatchObject({ frightLevel: 9 });

    // Pippin falls: half of the faction, the made-up threshold of 40%
    const pippin = rounds.find(each => each.actorId === 'pippin')!;
    expect((await as('owner').post(`/v1/actor-rounds/${pippin.id}/effects`, { status: 'unconscious' })).status).toBe(201);
    await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`);
    const alerts = (await roundsOf(gameId, 1)).find(each => each.actorId === 'merry')!.alerts;
    const suggested = alerts.filter(alert => alert.type === 'fear-check-suggested');
    expect(suggested).toHaveLength(1);
    expect(suggested[0].modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'factionId', modifier: 'faction-1' }),
        expect.objectContaining({ key: 'frightLevel', value: 6 }),
        expect.objectContaining({ key: 'fallenShare', value: 0.5 }),
      ]),
    );
    const game = (await as('owner').get(`/v1/tactical-games/${gameId}`)).body as { fearThresholdsAlerted: Record<string, string[]> };
    expect(game.fearThresholdsAlerted['faction-1']).toEqual(['0.4', '0.4+']);
    // The next upkeep does not alert it again
    await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`);
    const again = (await roundsOf(gameId, 2)).find(each => each.actorId === 'merry')!.alerts;
    expect(again.filter(alert => alert.type === 'fear-check-suggested')).toHaveLength(1);
  });

  it('removes a temporary modifier', async () => {
    const gameId = await createGame(['merry']);
    const [merry] = await roundsOf(gameId);
    const removed = await as('owner').delete(`/v1/actor-rounds/${merry.id}/temporary-modifiers/tm-1`);
    expect(removed.status).toBe(200);
    expect((removed.body as ActorRoundBody).temporaryModifiers).toEqual([]);
    const missing = await as('owner').delete(`/v1/actor-rounds/${merry.id}/temporary-modifiers/tm-1`);
    expect([missing.status, (missing.body as ErrorBody).code]).toEqual([404, 'err-temporary-modifier-not-found']);
  });
});

describe('injury limits and tourniquets (workspace spec 068)', () => {
  it('caps the pace of a splinted leg, and loosens a tourniquet that asked for it', async () => {
    e2e.world.characters.set(
      'sam',
      character('sam', {
        injuries: [
          wound('splinted', { limits: { pace: 'walk' } }),
          wound('cut', {
            type: 'cut-burn',
            severity: 'light',
            penalty: -5,
            initialPenalty: -5,
            bleeding: 0,
            tourniquet: { tightSince: 9, loosenedAt: null, bleeding: 3 },
          }),
        ],
      } as never),
    );
    const gameId = await createGame(['sam']);
    const [sam] = await roundsOf(gameId);
    // The tourniquet counts its rounds from this game
    expect(sam.injuries.find(each => each.id === 'cut')!.tourniquet).toMatchObject({ tightSince: 1 });
    await as('owner').post(`/v1/tactical-games/${gameId}/initiatives/randomize`);
    await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`);
    const movement = await as('owner').post('/v1/actions', { gameId, actorId: 'sam', actionType: 'movement', phaseStart: 1 });
    expect(movement.status).toBe(201);
    const resolve = (pace: string) =>
      as('owner').patch(`/v1/actions/${(movement.body as { id: string }).id}/movement/resolve`, {
        modifiers: { pace, requiredManeuver: false },
      });
    const tooFast = await resolve('jog');
    expect([tooFast.status, (tooFast.body as ErrorBody).code, (tooFast.body as ErrorBody).details]).toEqual([
      400,
      'err-movement-injury-limit',
      { pace: 'jog', limit: 'walk' },
    ]);
    expect((await resolve('walk')).status).toBe(200);

    // Made-up tourniquet rules: loosen every 3 rounds, 1 of grace
    // The upkeep that opens a round runs on the round that ends
    for (let round = 2; round <= 5; round++) {
      expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
    }
    const third = (await roundsOf(gameId, 3))[0];
    expect(third.alerts.map(alert => alert.type)).toContain('tourniquet-loosen');
    const fifth = (await roundsOf(gameId, 5))[0];
    expect(fifth.alerts.map(alert => alert.type)).toContain('limb-loss');
    expect(fifth.injuries.find(each => each.id === 'cut')!.flags).toContain('limb-loss');
    const loosened = await as('owner').post(`/v1/actor-rounds/${fifth.id}/injuries/cut/tourniquet/loosen`);
    expect(loosened.status).toBe(200);
    expect((loosened.body as ActorRoundBody).hp.current).toBe(fifth.hp.current - 3);
    const noTourniquet = await as('owner').post(`/v1/actor-rounds/${fifth.id}/injuries/splinted/tourniquet/loosen`);
    expect([noTourniquet.status, (noTourniquet.body as ErrorBody).code]).toEqual([400, 'err-injury-no-tourniquet']);
  });
});
