import request from 'supertest';
import { AttackTableEntry } from '../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { character, ids, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

type Modifier = { key: string; value: number; source?: string; rule?: string };

type ActionBody = {
  id: string;
  gameId: string;
  actorId: string;
  round: number;
  actionType: string;
  phaseStart: number;
  status: string;
  version: number;
  attacks?: { modifiers: { attackName: string; targetId: string }; roll?: { roll?: number }; results?: unknown; calculated?: unknown }[];
  [key: string]: unknown;
};

type AttackBody = {
  status: string;
  results: { attackTableEntry: { text: string; damage: number }; criticals: { key: string; status: string }[] };
};

let e2e: E2eApp;

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null });
  e2e.world.characters.set('aragorn', character('aragorn'));
  const [mainHand] = character('eomer').attacks;
  e2e.world.characters.set('eomer', character('eomer', { attacks: [mainHand, { ...mainHand, attackName: 'offHand' }] }));
  e2e.world.characters.set('lurtz', character('lurtz', { faction: { id: 'faction-2', name: 'Uruk-hai' } }));
  e2e.world.characters.set('faramir', character('faramir', { owner: USERS.other.sub }));
});

afterAll(async () => {
  await e2e?.stop();
});

const as = (user: UserName) => ({
  get: (url: string) => request(e2e.server).get(url).set('Authorization', e2e.auth(user)),
  post: (url: string, body: object = {}) => request(e2e.server).post(url).set('Authorization', e2e.auth(user)).send(body),
  patch: (url: string, body: object = {}) => request(e2e.server).patch(url).set('Authorization', e2e.auth(user)).send(body),
  delete: (url: string) => request(e2e.server).delete(url).set('Authorization', e2e.auth(user)),
});

/** A game with Aragorn (or another attacker) against Lurtz, in phase 1 of round 1. */
const gameInPhase1 = async (attacker = 'aragorn', others: string[] = []) => {
  const created = await as('owner').post('/v1/tactical-games', {
    strategicGameId: 'sg-1',
    name: 'Amon Hen',
    description: 'Parth Galen',
    factions: ['faction-1', 'faction-2'],
    actors: [{ id: attacker, type: 'character' }, { id: 'lurtz', type: 'character' }, ...others.map(id => ({ id, type: 'character' }))],
  });
  expect(created.status).toBe(201);
  const gameId = (created.body as { id: string }).id;
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/initiatives/randomize`)).status).toBe(200);
  expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
  return gameId;
};

const declareAttack = async (gameId: string, actorId = 'aragorn') => {
  const response = await as('owner').post('/v1/actions', { gameId, actorId, actionType: 'melee_attack', phaseStart: 1 });
  expect(response.status).toBe(201);
  return response.body as ActionBody;
};

describe('declare', () => {
  it('declares an action in the current phase and lists it', async () => {
    const gameId = await gameInPhase1();
    const action = await declareAttack(gameId);
    expect(action).toMatchObject({ gameId, actorId: 'aragorn', round: 1, actionType: 'melee_attack', phaseStart: 1 });
    expect(e2e.world.events).toContainEqual(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- a nested asymmetric matcher is typed any
      expect.objectContaining({ aggregateType: 'action', event: expect.objectContaining({ eventType: 'ActionCreatedEvent' }) }),
    );

    const read = await as('owner').get(`/v1/actions/${action.id}`);
    expect(read.status).toBe(200);
    const page = await as('owner').get(`/v1/actions?q=gameId==${gameId};round==1&page=0&size=1000`);
    expect(page.status).toBe(200);
    expect(ids(page.body)).toEqual([action.id]);
  });

  it('rejects an action before the phases start', async () => {
    const created = await as('owner').post('/v1/tactical-games', {
      strategicGameId: 'sg-1',
      name: 'Weathertop',
      description: 'Amon Sul',
      factions: ['faction-1'],
      actors: [{ id: 'aragorn', type: 'character' }],
    });
    const gameId = (created.body as { id: string }).id;
    await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`);
    const response = await as('owner').post('/v1/actions', { gameId, actorId: 'aragorn', actionType: 'melee_attack', phaseStart: 1 });
    expect(response.status).toBe(400);
  });

  // rmu-mfe-tactical loads every action of a round in one page: actions go up to 1000 a page (spec 020).
  it('limits the page size to 1000', async () => {
    expect((await as('owner').get('/v1/actions?size=1000')).status).toBe(200);
    expect((await as('owner').get('/v1/actions?size=1001')).status).toBe(400);
  });

  it('changes the description with the version it read, and rejects a stale one', async () => {
    const gameId = await gameInPhase1();
    const action = await declareAttack(gameId);
    expect(action.version).toBe(0);
    const changed = await as('owner').patch(`/v1/actions/${action.id}`, { description: 'Strike', version: 0 });
    expect(changed.status).toBe(200);
    expect(changed.body).toMatchObject({ description: 'Strike', version: 1 });
    const stale = await as('owner').patch(`/v1/actions/${action.id}`, { description: 'Again', version: 0 });
    expect(stale.status).toBe(409);
    expect(stale.body).toMatchObject({ code: 'version-conflict' });
  });

  // Spec 021, decision 9 [F-tactical-19]: a PATCH that changes nothing neither writes nor publishes.
  it('answers 200 without a write or an event to a change that changes nothing', async () => {
    const gameId = await gameInPhase1();
    const action = await declareAttack(gameId);
    expect((await as('owner').patch(`/v1/actions/${action.id}`, { description: 'Strike' })).status).toBe(200);
    const before = e2e.world.events.length;
    const same = await as('owner').patch(`/v1/actions/${action.id}`, { description: 'Strike' });
    expect(same.status).toBe(200);
    expect(same.body).toMatchObject({ description: 'Strike', version: 1 });
    expect(e2e.world.events.slice(before).filter(e => e.aggregateType === 'action')).toEqual([]);
  });

  it('validates the body', async () => {
    expect((await as('owner').post('/v1/actions', { actorId: 'aragorn' })).status).toBe(400);
  });

  it('rejects a maneuver without its skill', async () => {
    const gameId = await gameInPhase1();
    const response = await as('owner').post('/v1/actions', { gameId, actorId: 'aragorn', actionType: 'maneuver', phaseStart: 1 });
    expect(response.status).toBe(400);
  });

  // A game that is not there is a 404 [F-tactical-18].
  it('answers 404 for an unknown game', async () => {
    const response = await as('owner').post('/v1/actions', {
      gameId: 'nope',
      actorId: 'aragorn',
      actionType: 'melee_attack',
      phaseStart: 1,
    });
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ error: 'NotFoundError', code: 'not-found', message: 'Game nope not found' });
  });

  // An actor that is not in the round is a 404 too [F-tactical-18].
  it('answers 404 for an actor without an actor round', async () => {
    const gameId = await gameInPhase1();
    const response = await as('owner').post('/v1/actions', { gameId, actorId: 'nobody', actionType: 'melee_attack', phaseStart: 1 });
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: 'not-found' });
  });

  it('answers 404 for an unknown action', async () => {
    expect((await as('owner').get('/v1/actions/00000000-0000-0000-0000-000000000000')).status).toBe(404);
  });

  it('deletes an action', async () => {
    const gameId = await gameInPhase1();
    const action = await declareAttack(gameId);
    const deleted = await as('owner').delete(`/v1/actions/${action.id}`);
    expect(deleted.status).toBe(204);
    expect((await as('owner').get(`/v1/actions/${action.id}`)).status).toBe(404);
  });
});

describe('attack', () => {
  it('prepares, rolls and applies an attack against the fake tables', async () => {
    const gameId = await gameInPhase1();
    const action = await declareAttack(gameId);
    const rounds = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==1`);
    const lurtz = (rounds.body as { content: { id: string; actorId: string; hp: { current: number } }[] }).content.find(
      ar => ar.actorId === 'lurtz',
    )!;

    // An attack needs 2 AP: the action takes the AP of phase 1 and of phase 2.
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
    const prepared = await as('owner').patch(`/v1/actions/${action.id}/attack/prepare`, {
      attacks: [{ attackName: 'mainHand', modifiers: { targetId: 'lurtz', bo: 60 }, protectors: null }],
    });
    expect(prepared.status).toBe(200);
    expect((prepared.body as ActionBody).attacks).toHaveLength(1);
    // Spec 051: each modifier carries its rule, and whoever cannot parry is listed with the reason
    const calculated = (prepared.body as ActionBody).attacks![0].calculated as { rollModifiers: Modifier[]; skipped: unknown[] };
    expect(calculated.rollModifiers.find(modifier => modifier.key === 'bo')).toMatchObject({
      value: 60,
      source: 'offensive-bonus',
      rule: '§9.5',
    });
    expect(Array.isArray(calculated.skipped)).toBe(true);
    expect((prepared.body as ActionBody).parryExclusions).toEqual([
      expect.objectContaining({ actorId: 'lurtz', targetActorId: 'lurtz', parryType: 'parry', reason: 'parry-last-action' }),
    ]);

    const rolled = await as('owner').patch(`/v1/actions/${action.id}/attack/roll`, { attackName: 'mainHand', roll: 70 });
    expect(rolled.status).toBe(200);
    const attack = (rolled.body as ActionBody).attacks![0] as unknown as AttackBody;
    expect(attack.status).toBe('pending_critical_roll');
    expect(attack.results.attackTableEntry).toMatchObject({ text: '12CS', damage: 12 });
    expect(attack.results.criticals).toEqual([expect.objectContaining({ key: 's_c_1', status: 'pending_roll' })]);
    expect(e2e.world.lookups.attack.at(-1)).toMatchObject({ attackTable: 'arming-sword' });

    expect(
      (await as('owner').patch(`/v1/actions/${action.id}/attack/critical-roll`, { attackName: 'mainHand', criticalKey: 'nope', roll: 50 }))
        .status,
    ).toBe(400);
    const critical = await as('owner').patch(`/v1/actions/${action.id}/attack/critical-roll`, {
      attackName: 'mainHand',
      criticalKey: 's_c_1',
      roll: 50,
    });
    expect(critical.status).toBe(200);
    expect(e2e.world.lookups.critical.length).toBeGreaterThan(0);
    // The critical roll can change until the attack is applied, as the attack and fumble rolls.
    const changed = await as('owner').patch(`/v1/actions/${action.id}/attack/critical-roll`, {
      attackName: 'mainHand',
      criticalKey: 's_c_1',
      roll: 60,
    });
    expect(changed.status).toBe(200);
    expect(changed.body).toMatchObject({ attacks: [{ roll: { criticalRolls: { s_c_1: 60 } } }] });
    expect(e2e.world.lookups.critical.length).toBeGreaterThan(1);

    const applied = await as('owner').patch(`/v1/actions/${action.id}/attack/apply`);
    expect(applied.status).toBe(200);
    const late = await as('owner').patch(`/v1/actions/${action.id}/attack/critical-roll`, {
      attackName: 'mainHand',
      criticalKey: 's_c_1',
      roll: 70,
    });
    expect(late.status).toBe(400);
    expect(late.body).toMatchObject({ code: 'err-attack-completed' });
    const after = await as('owner').get(`/v1/actor-rounds/${lurtz.id}`);
    // 12 of the table plus 6 of the critical.
    expect((after.body as { hp: { current: number } }).hp.current).toBe(lurtz.hp.current - 18);
  });
});

describe('fighting style critical options (workspace spec 032)', () => {
  beforeAll(() => {
    e2e.world.fightingStyles = {
      styles: [{ id: 'made-up', skillId: 'battle-styles', abilities: [], equipment: [] }],
      abilities: [
        { id: 'leg-sweep', equipment: [] },
        { id: 'redirect', equipment: [] },
      ],
    };
    e2e.world.characters.set(
      'gimli',
      character('gimli', {
        skills: [
          {
            skillId: 'battle-styles',
            specialization: 'made-up',
            totalBonus: 0,
            ranks: 8,
            styleFreeRanks: 0,
            styleAbilities: [
              { abilityId: 'leg-sweep', times: 1, cost: 4 },
              { abilityId: 'redirect', times: 1, cost: 4 },
            ],
          },
        ],
      }),
    );
  });

  const styledAttack = async (styleCriticalOption?: string) => {
    const gameId = await gameInPhase1('gimli');
    const rounds = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==1`);
    const gimli = (rounds.body as { content: { id: string; actorId: string }[] }).content.find(ar => ar.actorId === 'gimli')!;
    const styled = await as('owner').patch(`/v1/actor-rounds/${gimli.id}/fighting-style`, { skillId: 'battle-styles', styleId: 'made-up' });
    expect(styled.status).toBe(200);
    const action = await declareAttack(gameId, 'gimli');
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
    const prepared = await as('owner').patch(`/v1/actions/${action.id}/attack/prepare`, {
      attacks: [{ attackName: 'mainHand', modifiers: { targetId: 'lurtz', bo: 60, styleCriticalOption }, protectors: null }],
    });
    expect(prepared.status).toBe(200);
    expect((await as('owner').patch(`/v1/actions/${action.id}/attack/roll`, { attackName: 'mainHand', roll: 70 })).status).toBe(200);
    return action;
  };

  type CriticalBody = { criticalType: string; criticalSeverity: string; styleOption?: { abilityId: string; originalSeverity: string } };
  const firstCritical = (body: unknown) =>
    (body as { attacks: { results: { criticals: CriticalBody[] } }[] }).attacks[0].results.criticals[0];

  it('lowers the critical declared with Leg Sweep before looking it up', async () => {
    const action = await styledAttack('leg-sweep');
    const critical = await as('owner').patch(`/v1/actions/${action.id}/attack/critical-roll`, {
      attackName: 'mainHand',
      criticalKey: 's_c_1',
      roll: 50,
    });
    expect(critical.status).toBe(200);
    expect(firstCritical(critical.body)).toMatchObject({
      criticalType: 'S',
      criticalSeverity: 'B',
      styleOption: { abilityId: 'leg-sweep', originalSeverity: 'C' },
    });
    expect(e2e.world.lookups.critical.at(-1)).toMatchObject({ criticalType: 'S', criticalSeverity: 'B' });
  });

  it('chooses Redirect before the critical roll, and rejects an option the style does not give', async () => {
    const action = await styledAttack();
    const rejected = await as('owner').patch(`/v1/actions/${action.id}/attack/critical-roll`, {
      attackName: 'mainHand',
      criticalKey: 's_c_1',
      roll: 50,
      styleOption: 'overbearing',
    });
    expect(rejected.status).toBe(400);
    expect((rejected.body as { code: string }).code).toBe('err-style-critical-option');
    const critical = await as('owner').patch(`/v1/actions/${action.id}/attack/critical-roll`, {
      attackName: 'mainHand',
      criticalKey: 's_c_1',
      roll: 50,
      styleOption: 'redirect',
    });
    expect(critical.status).toBe(200);
    expect(firstCritical(critical.body)).toMatchObject({ criticalSeverity: 'B', styleOption: { abilityId: 'redirect' } });
  });

  it('rejects a critical option declared with the attack that the style does not give', async () => {
    const gameId = await gameInPhase1();
    const action = await declareAttack(gameId);
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
    const prepared = await as('owner').patch(`/v1/actions/${action.id}/attack/prepare`, {
      attacks: [{ attackName: 'mainHand', modifiers: { targetId: 'lurtz', bo: 60, styleCriticalOption: 'leg-sweep' }, protectors: null }],
    });
    expect(prepared.status).toBe(400);
  });
});

// Two attacks of one action subtract their OB from the same attacker's actor round [F-tactical-15].
describe('attack with two weapons', () => {
  const twoAttacks = async () => {
    const gameId = await gameInPhase1('eomer');
    const action = await declareAttack(gameId, 'eomer');
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
    const prepared = await as('owner').patch(`/v1/actions/${action.id}/attack/prepare`, {
      attacks: ['mainHand', 'offHand'].map(attackName => ({ attackName, modifiers: { targetId: 'lurtz', bo: 30 }, protectors: null })),
    });
    expect(prepared.status).toBe(200);
    e2e.world.attackEntry = new AttackTableEntry('8', 8, undefined, undefined);
    try {
      for (const attackName of ['mainHand', 'offHand']) {
        expect((await as('owner').patch(`/v1/actions/${action.id}/attack/roll`, { attackName, roll: 60 })).status).toBe(200);
      }
    } finally {
      e2e.world.attackEntry = new AttackTableEntry('12CS', 12, 'S', 'C');
    }
    return action;
  };

  it('applies both attacks [F-tactical-15]', async () => {
    const action = await twoAttacks();
    expect((await as('owner').patch(`/v1/actions/${action.id}/attack/apply`)).status).toBe(200);
  });
});

// Spec 021, decision 2 [F-tactical-11]: the owner of a character declares and resolves the actions of its actor, and a
// manager of the game (its owner, the owner of the strategic game or an admin) those of every actor.
describe('permissions', () => {
  const declare = (user: UserName, gameId: string, actorId = 'aragorn') =>
    as(user).post('/v1/actions', { gameId, actorId, actionType: 'melee_attack', phaseStart: 1 });

  describe('create', () => {
    it.each(['owner', 'admin'] as const)('lets %s declare an action for any actor', async user => {
      const gameId = await gameInPhase1();
      expect((await declare(user, gameId)).status).toBe(201);
    });

    it('lets the owner of a character declare for its actor, and only for it', async () => {
      const gameId = await gameInPhase1('aragorn', ['faramir']);
      expect((await declare('other', gameId, 'faramir')).status).toBe(201);
      expect((await declare('other', gameId, 'aragorn')).status).toBe(403);
    });

    it.each(['other', 'noRole'] as const)('forbids %s to declare an action for the actor of the owner [F-tactical-11]', async user => {
      const gameId = await gameInPhase1();
      const response = await declare(user, gameId);
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ code: 'forbidden' });
    });

    it('rejects a request without a token', async () => {
      expect((await request(e2e.server).post('/v1/actions').send({ gameId: 'x', actorId: 'y' })).status).toBe(401);
    });
  });

  describe('update and delete', () => {
    let action: ActionBody;

    beforeEach(async () => {
      action = await declareAttack(await gameInPhase1());
    });

    it.each(['owner', 'admin'] as const)('lets %s change and delete the action', async user => {
      expect((await as(user).patch(`/v1/actions/${action.id}`, { description: user })).status).toBe(200);
      expect((await as(user).delete(`/v1/actions/${action.id}`)).status).toBe(204);
    });

    it.each(['other', 'noRole'] as const)('forbids %s to change, resolve or delete the action [F-tactical-11]', async user => {
      expect((await as(user).patch(`/v1/actions/${action.id}`, { description: 'x' })).status).toBe(403);
      expect((await as(user).patch(`/v1/actions/${action.id}/attack/roll`, { attackName: 'mainHand', roll: 70 })).status).toBe(403);
      expect((await as(user).patch(`/v1/actions/${action.id}/attack/parry`, { parries: [] })).status).toBe(403);
      expect((await as(user).delete(`/v1/actions/${action.id}`)).status).toBe(403);
      expect((await as('owner').get(`/v1/actions/${action.id}`)).status).toBe(200);
    });

    it('reads as the game is read, and lists only the actions of readable games', async () => {
      expect((await as('noRole').get(`/v1/actions/${action.id}`)).status).toBe(403);
      expect((await as('admin').get(`/v1/actions/${action.id}`)).status).toBe(200);
      expect(ids((await as('noRole').get(`/v1/actions?q=gameId==${action.gameId}`)).body)).toEqual([]);
      expect(ids((await as('owner').get(`/v1/actions?q=gameId==${action.gameId}`)).body)).toEqual([action.id]);
    });

    it('rejects a request without a token', async () => {
      expect((await request(e2e.server).delete(`/v1/actions/${action.id}`)).status).toBe(401);
    });
  });
});

describe('social maneuvers (workspace spec 022)', () => {
  it('resolves Trading against another actor as a price', async () => {
    e2e.world.skillProfiles.set('trading', { defaultType: 'percent', resultKind: 'price' });
    e2e.world.characters.set(
      'aragorn',
      character('aragorn', { skills: [{ skillId: 'trading', specialization: null, totalBonus: 20, ranks: 2 }] }),
    );
    e2e.world.characters.set(
      'lurtz',
      character('lurtz', {
        faction: { id: 'faction-2', name: 'Uruk-hai' },
        skills: [{ skillId: 'trading', specialization: null, totalBonus: 10, ranks: 1 }],
      }),
    );
    const gameId = await gameInPhase1();
    const declared = await as('owner').post('/v1/actions', {
      gameId,
      actorId: 'aragorn',
      actionType: 'maneuver',
      phaseStart: 1,
      maneuver: { skillId: 'trading' },
    });
    expect(declared.status).toBe(201);
    const resolved = await as('owner').patch(`/v1/actions/${(declared.body as ActionBody).id}/maneuver/resolve`, {
      roll: { roll: 70 },
      targetActorId: 'lurtz',
      passiveRoll: 40,
    });
    expect(resolved.status).toBe(200);
    type Entry = { key: string; group?: string; rule?: string; params?: Record<string, unknown> };
    const maneuver = (resolved.body as { maneuver: { modifiers: object; result: object; roll: { modifiers: Entry[] } } }).maneuver;
    // 70 + 20 + (100 - 50) = 140: the fake percent table answers 100, so the price is 100%.
    expect(maneuver.modifiers).toMatchObject({ targetActorId: 'lurtz', passiveSkillId: 'trading', passiveTotal: 50 });
    // Workspace spec 052: the breakdown explains itself
    const entry = (key: string) => maneuver.roll.modifiers.find(each => each.key === key);
    expect(entry('trading')).toMatchObject({ group: 'skill', rule: 'Table 3-0b', params: { ranks: 2 } });
    expect(entry('conflict')).toMatchObject({ group: 'situation', rule: '§8.2', params: { passive: 50 } });
    expect(maneuver.result).toMatchObject({ percent: 100, price: 100 });
    e2e.world.skillProfiles.clear();
    e2e.world.characters.set('aragorn', character('aragorn'));
    e2e.world.characters.set('lurtz', character('lurtz', { faction: { id: 'faction-2', name: 'Uruk-hai' } }));
  });
});

describe('frenzy maneuvers (workspace spec 040)', () => {
  type RoundBody = { id: string; actorId: string; effects: { status: string; value?: number }[] };

  const aragornRound = async (gameId: string) => {
    const rounds = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==1`);
    return (rounds.body as { content: RoundBody[] }).content.find(round => round.actorId === 'aragorn')!;
  };

  /** One maneuver per phase: each one takes the AP of its phase. */
  const frenzyManeuver = async (gameId: string, purpose: string, roll: number, phase = 1) => {
    if (phase > 1) {
      expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
    }
    const declared = await as('owner').post('/v1/actions', {
      gameId,
      actorId: 'aragorn',
      actionType: 'maneuver',
      phaseStart: phase,
      maneuver: { skillId: 'adrenal-focus' },
    });
    expect(declared.status).toBe(201);
    return as('owner').patch(`/v1/actions/${(declared.body as ActionBody).id}/maneuver/resolve`, { roll: { roll }, purpose });
  };

  afterEach(() => {
    e2e.world.characters.set('aragorn', character('aragorn'));
  });

  it('enters the frenzy on a success, stays out of it on a failure, and leaves it', async () => {
    e2e.world.characters.set(
      'aragorn',
      character('aragorn', {
        traits: [{ traitId: 'frenzy', traitName: 'Frenzy', isTalent: true, cost: 10 }],
        skills: [{ skillId: 'adrenal-focus', specialization: null, totalBonus: 30, ranks: 3 }],
      }),
    );
    const gameId = await gameInPhase1();

    const failed = await frenzyManeuver(gameId, 'frenzy-enter', 10);
    expect(failed.status).toBe(200);
    expect((await aragornRound(gameId)).effects.map(e => e.status)).not.toContain('frenzy');

    const entered = await frenzyManeuver(gameId, 'frenzy-enter', 120, 2);
    expect(entered.status).toBe(200);
    expect((entered.body as { maneuver: { modifiers: object } }).maneuver.modifiers).toMatchObject({ purpose: 'frenzy-enter' });
    expect((await aragornRound(gameId)).effects).toContainEqual(expect.objectContaining({ status: 'frenzy', value: 1 }));

    const left = await frenzyManeuver(gameId, 'frenzy-exit', 120, 3);
    expect(left.status).toBe(200);
    expect((await aragornRound(gameId)).effects.map(e => e.status)).not.toContain('frenzy');
  });

  it('rejects an actor without the Frenzy talent', async () => {
    e2e.world.characters.set(
      'aragorn',
      character('aragorn', { skills: [{ skillId: 'adrenal-focus', specialization: null, totalBonus: 30, ranks: 3 }] }),
    );
    const gameId = await gameInPhase1();
    const rejected = await frenzyManeuver(gameId, 'frenzy-enter', 120);
    expect(rejected.status).toBe(422);
    expect(rejected.body).toMatchObject({ code: 'err-frenzy-without-trait' });
  });
});
