import request from 'supertest';
import type { CharacterSpellcasting } from '../../src/modules/strategic/application/ports/character-magic.port.js';
import { character, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

type Modifier = { key: string; value: number };
type SpellActionBody = {
  id: string;
  status: string;
  actionType: string;
  freeAction: boolean;
  spell: {
    spell: { spellId: string; name: string; powerPoints: number; type: string };
    caster: { ranks: number; realmStatBonus: number; level: number };
    roll?: { roll: number; totalRoll: number; modifiers: Modifier[] };
    result?: string;
    failure?: { realm: string; roll: number; modifier: number; total: number; text: string; suggestedPp: string };
    targets?: { actorId: string; total: number; required: number; resisted: boolean; failure: number; breakdown: Modifier[] }[];
    powerPointsSpent?: number;
  };
};

let e2e: E2eApp;

/** An invented spellbook (not book data): an essence base list known to 5 ranks. */
const spellbook = (current = 10): CharacterSpellcasting => ({
  characterId: 'gandalf',
  realms: ['essence'],
  realmStatBonus: 8,
  level: 3,
  power: { max: 10, current },
  lists: [
    {
      skillId: 'base-spell-list',
      code: 'e2e-list',
      spellListId: 'list-1',
      name: 'E2E list',
      type: 'base',
      realms: ['essence'],
      ranks: 5,
      listTypeModifier: 5,
      spells: [
        {
          spell: {
            id: 'bolt',
            name: 'E2E Bolt',
            level: 2,
            modifiers: { type: 'elemental', instant: false, resistance: { kind: 'none', modifier: null, scaling: null } },
          },
          powerPoints: 2,
        },
        {
          spell: {
            id: 'sleep',
            name: 'E2E Sleep',
            level: 1,
            modifiers: { type: 'force', instant: true, resistance: { kind: 'realm', modifier: -5, scaling: 'per-failure' } },
            effects: [{ kind: 'condition', status: 'asleep' }],
          },
          powerPoints: 1,
        },
        {
          spell: {
            id: 'big',
            name: 'E2E Big',
            level: 5,
            modifiers: { type: 'utility', instant: false, resistance: { kind: 'willing', modifier: null, scaling: null } },
          },
          powerPoints: 5,
        },
      ],
    },
  ],
});

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
  e2e.world.characters.set('gandalf', character('gandalf'));
  e2e.world.characters.set(
    'lurtz',
    character('lurtz', { faction: { id: 'faction-2', name: 'Uruk-hai' }, resistances: [{ resistance: 'essence', totalBonus: 10 }] }),
  );
});

beforeEach(() => {
  e2e.world.spellcasting.set('gandalf', spellbook());
  e2e.world.powerSpent = [];
  e2e.world.spellFailureLookups = [];
});

afterAll(async () => {
  await e2e?.stop();
});

const as = (user: UserName) => ({
  post: (url: string, body: object = {}) => request(e2e.server).post(url).set('Authorization', e2e.auth(user)).send(body),
  patch: (url: string, body: object = {}) => request(e2e.server).patch(url).set('Authorization', e2e.auth(user)).send(body),
});

const gameInPhase1 = async () => {
  const created = await as('owner').post('/v1/tactical-games', {
    strategicGameId: 'sg-1',
    name: 'Bridge',
    description: 'Khazad-dum',
    factions: ['faction-1', 'faction-2'],
    actors: [
      { id: 'gandalf', type: 'character' },
      { id: 'lurtz', type: 'character' },
    ],
  });
  expect(created.status).toBe(201);
  const gameId = (created.body as { id: string }).id;
  for (const step of ['rounds/start', 'initiatives/randomize', 'phases/start']) {
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/${step}`)).status).toBe(200);
  }
  return gameId;
};

const nextPhase = async (gameId: string) => expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);

const declare = (gameId: string, spellId: string, freeAction = false) =>
  as('owner').post('/v1/actions', {
    gameId,
    actorId: 'gandalf',
    actionType: 'cast_spell',
    phaseStart: 1,
    freeAction,
    spell: { listCode: 'e2e-list', spellId },
  });

const declared = async (gameId: string, spellId: string, freeAction = false) => {
  const response = await declare(gameId, spellId, freeAction);
  expect(response.status).toBe(201);
  return response.body as SpellActionBody;
};

describe('declare a cast (spec 030)', () => {
  it('copies the spell and the caster from the spellbook of strategic', async () => {
    const gameId = await gameInPhase1();
    const action = await declared(gameId, 'sleep', true);
    // Instantaneous: no AP and no AP penalty
    expect(action).toMatchObject({ actionType: 'cast_spell', freeAction: true, status: 'declared', readinessPenalty: 0 });
    expect(action.spell.spell).toMatchObject({ spellId: 'sleep', name: 'E2E Sleep', powerPoints: 1, type: 'force' });
    expect(action.spell.caster).toMatchObject({ ranks: 5, realmStatBonus: 8, level: 3 });
  });

  it('rejects unknown spells, a non-instantaneous spell as instantaneous, and a cast without its spell', async () => {
    const gameId = await gameInPhase1();
    expect((await declare(gameId, 'missing')).body).toMatchObject({ code: 'err-spell-not-known' });
    expect((await declare(gameId, 'bolt', true)).body).toMatchObject({ code: 'err-spell-not-instant' });
    const noSpell = await as('owner').post('/v1/actions', { gameId, actorId: 'gandalf', actionType: 'cast_spell', phaseStart: 1 });
    expect(noSpell.body).toMatchObject({ code: 'err-spell-required' });
    expect(
      (
        await as('owner').post('/v1/actions', {
          gameId,
          actorId: 'lurtz',
          actionType: 'cast_spell',
          phaseStart: 1,
          spell: { listCode: 'x', spellId: 'y' },
        })
      ).body,
    ).toMatchObject({
      code: 'err-actor-without-spellbook',
    });
  });

  it('counts the power points of the open casts of the round', async () => {
    e2e.world.spellcasting.set('gandalf', spellbook(1));
    const gameId = await gameInPhase1();
    await declared(gameId, 'sleep', true);
    expect((await declare(gameId, 'sleep', true)).body).toMatchObject({ code: 'err-insufficient-power' });
  });
});

describe('resolve a cast', () => {
  it('casts an instantaneous spell, rolls the resistance of the target and spends its power points', async () => {
    const gameId = await gameInPhase1();
    const action = await declared(gameId, 'sleep', true);
    const rolled = await as('owner').patch(`/v1/actions/${action.id}/spell/roll`, { roll: 50 });
    expect(rolled.status).toBe(200);
    const body = rolled.body as SpellActionBody;
    // 5 ranks + 8 realm stat + 5 own base list
    expect(body.spell.roll).toMatchObject({ roll: 50, totalRoll: 68 });
    expect(body).toMatchObject({ status: 'pending_apply', spell: { result: 'success' } });

    const rr = await as('owner').patch(`/v1/actions/${action.id}/spell/resistance-rolls`, { targets: [{ actorId: 'lurtz', roll: 30 }] });
    expect(rr.status).toBe(200);
    // 30 + 10 essence RR - 2 x 3 caster level - 5 of the spell
    expect((rr.body as SpellActionBody).spell.targets).toEqual([
      expect.objectContaining({ actorId: 'lurtz', total: 29, required: 68, resisted: false, failure: 39 }),
    ]);

    const applied = await as('owner').patch(`/v1/actions/${action.id}/spell/apply`);
    expect(applied.status).toBe(200);
    expect(applied.body).toMatchObject({ status: 'completed', spell: { powerPointsSpent: 1 } });
    expect(e2e.world.powerSpent).toEqual([{ characterId: 'gandalf', amount: 1 }]);
  });

  it('needs the minimum AP, takes -25 per AP missing and rolls the spell failure of a negative SCR', async () => {
    const gameId = await gameInPhase1();
    const action = await declared(gameId, 'bolt');
    expect((await as('owner').patch(`/v1/actions/${action.id}/spell/roll`, { roll: 30 })).body).toMatchObject({
      code: 'err-action-points-below-min',
    });
    await nextPhase(gameId);
    const options = { subtle: true, hands: 'one' };
    const preview = await as('owner').post(`/v1/actions/${action.id}/spell/preview`, { options });
    expect(preview.status).toBe(200);
    // 18 base, subtle elemental -7, one hand -3, fast casting with 2 of 4 AP -50
    expect(preview.body).toMatchObject({ bonus: -42, needsPreparation: false, actionPoints: 2 });

    const rolled = await as('owner').patch(`/v1/actions/${action.id}/spell/roll`, { roll: 30, options });
    expect(rolled.body).toMatchObject({ status: 'pending_roll', spell: { result: 'failure', roll: { totalRoll: -12 } } });
    expect((await as('owner').patch(`/v1/actions/${action.id}/spell/resistance-rolls`, { targets: [] })).status).toBe(400);

    const failure = await as('owner').patch(`/v1/actions/${action.id}/spell/failure-roll`, { roll: 20 });
    expect(failure.status).toBe(200);
    // The failure roll adds the net negative modifiers but the ranks and realm stat: -(5 - 7 - 3 - 50) = 55
    expect((failure.body as SpellActionBody).spell.failure).toMatchObject({
      realm: 'essence',
      modifier: 55,
      total: 75,
      suggestedPp: 'half-down',
    });
    expect(e2e.world.spellFailureLookups).toEqual([{ realm: 'essence', type: 'elemental', roll: 75 }]);

    const applied = await as('owner').patch(`/v1/actions/${action.id}/spell/apply`);
    expect(applied.body).toMatchObject({ status: 'completed', spell: { powerPointsSpent: 1 } });
  });

  it('asks a preparation round for an overcast spell and lets the game master set the power points', async () => {
    const gameId = await gameInPhase1();
    const action = await declared(gameId, 'big');
    for (let phase = 2; phase <= 4; phase++) await nextPhase(gameId);
    expect((await as('owner').patch(`/v1/actions/${action.id}/spell/roll`, { roll: 90 })).body).toMatchObject({
      code: 'err-overcast-needs-preparation',
    });
    const rolled = await as('owner').patch(`/v1/actions/${action.id}/spell/roll`, { roll: 90, options: { preparationRounds: 1 } });
    // 18 base - 40 overcasting (2 levels) + 10 preparation
    expect(rolled.body).toMatchObject({ status: 'pending_apply', spell: { result: 'success', roll: { totalRoll: 78 } } });
    expect((await as('owner').patch(`/v1/actions/${action.id}/spell/apply`, { powerPoints: 11 })).body).toMatchObject({
      code: 'err-insufficient-power',
    });
    expect((await as('owner').patch(`/v1/actions/${action.id}/spell/apply`, { powerPoints: 3 })).body).toMatchObject({
      spell: { powerPointsSpent: 3 },
    });
  });

  it('rejects a resistance roll against a spell that allows none, and lets only the managers act', async () => {
    const gameId = await gameInPhase1();
    const action = await declared(gameId, 'bolt');
    await nextPhase(gameId);
    await nextPhase(gameId);
    await nextPhase(gameId);
    expect((await as('other').patch(`/v1/actions/${action.id}/spell/roll`, { roll: 50 })).status).toBe(403);
    expect((await as('owner').patch(`/v1/actions/${action.id}/spell/roll`, { roll: 50 })).body).toMatchObject({
      spell: { result: 'success' },
    });
    expect(
      (await as('owner').patch(`/v1/actions/${action.id}/spell/resistance-rolls`, { targets: [{ actorId: 'lurtz', roll: 50 }] })).body,
    ).toMatchObject({
      code: 'err-spell-no-resistance',
    });
  });
});
