import request from 'supertest';
import { AttackTableEntry } from '../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { character, faction, npc, startApp, USERS, type E2eApp, type UserName } from './support/app.js';

// Spec 055, phase 3: NPCs fight. A full round of a character against two specimens of an invented wolf-like NPC.

type ActorRoundBody = {
  id: string;
  actorId: string;
  actorType: string;
  actorName: string;
  npcId?: string;
  characterId?: string;
  size: number;
  raceName: string;
  level: number;
  factionId: string;
  hp: { max: number; current: number; deathThreshold?: number };
  defense: { bd: number; at: number; headAt: number; bodyAt: number; shield: unknown };
  initiative: { base: number; roll?: number; total?: number };
  movement: { bmr: number; maxPace: string; baseDifficulty: string };
  attacks: {
    attackName: string;
    baseBo: number;
    attackTable: string;
    fumbleTable: string;
    attackSize: number;
    fumble: number;
    type: string;
  }[];
  resistances: { resistance: string; totalBonus: number }[];
  effects: { status: string }[];
};

type ActionBody = { id: string; attacks?: { status: string; results?: { fumble?: unknown; criticals?: { key: string }[] } }[] };

let e2e: E2eApp;

beforeAll(async () => {
  e2e = await startApp();
  e2e.world.strategicGames.set('sg-1', { id: 'sg-1', owner: USERS.owner.sub, options: null, realmId: 'realm-1' });
  e2e.world.factions.set('faction-1', faction('faction-1', { name: 'Fellowship' }));
  e2e.world.characters.set(
    'beorn',
    character('beorn', { skills: [{ skillId: 'acrobatics', specialization: null, totalBonus: 10, ranks: 1 }] }),
  );
  // A generic realm lends its creatures to every campaign.
  e2e.world.realms.set('realm-core', { id: 'realm-core', name: 'Core', generic: true });
  e2e.world.npcs.set('warg', npc('warg', { name: 'Warg', realmId: 'realm-core' }));
});

afterAll(async () => {
  await e2e?.stop();
});

const as = (user: UserName) => ({
  get: (url: string) => request(e2e.server).get(url).set('Authorization', e2e.auth(user)),
  post: (url: string, body: object = {}) => request(e2e.server).post(url).set('Authorization', e2e.auth(user)).send(body),
  patch: (url: string, body: object = {}) => request(e2e.server).patch(url).set('Authorization', e2e.auth(user)).send(body),
});

const rounds = async (gameId: string, round = 1) => {
  const response = await as('owner').get(`/v1/actor-rounds?q=gameId==${gameId};round==${round}`);
  expect(response.status).toBe(200);
  return (response.body as { content: ActorRoundBody[] }).content;
};

const readRound = async (id: string) => (await as('owner').get(`/v1/actor-rounds/${id}`)).body as ActorRoundBody;

const declareAttack = async (gameId: string, actorId: string) => {
  const response = await as('owner').post('/v1/actions', { gameId, actorId, actionType: 'melee_attack', phaseStart: 1 });
  expect(response.status).toBe(201);
  return response.body as ActionBody;
};

const prepare = async (action: ActionBody, attackName: string, targetId: string, bo: number) => {
  const response = await as('owner').patch(`/v1/actions/${action.id}/attack/prepare`, {
    attacks: [{ attackName, modifiers: { targetId, bo }, protectors: null }],
  });
  expect(response.status).toBe(200);
};

const roll = async (action: ActionBody, attackName: string, value: number) => {
  const response = await as('owner').patch(`/v1/actions/${action.id}/attack/roll`, { attackName, roll: value });
  expect(response.status).toBe(200);
  return (response.body as ActionBody).attacks![0];
};

const apply = async (action: ActionBody) => expect((await as('owner').patch(`/v1/actions/${action.id}/attack/apply`)).status).toBe(200);

describe('a round of a character against NPCs', () => {
  it('builds the NPC actor rounds, takes their initiative, and resolves their attacks and the attacks on them', async () => {
    const created = await as('owner').post('/v1/tactical-games', {
      strategicGameId: 'sg-1',
      name: 'Carrock',
      factions: ['faction-1'],
      actors: [{ id: 'beorn', type: 'character' }],
      environmentFaction: { name: 'Mirkwood', npcs: [{ npcId: 'warg', count: 2 }] },
    });
    expect(created.status).toBe(201);
    const gameId = (created.body as { id: string }).id;
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);

    // Round 1 builds an actor round per specimen from the stat block.
    const all = await rounds(gameId);
    expect(all.map(each => each.actorName).sort()).toEqual(['Warg 1', 'Warg 2', 'beorn']);
    const wargs = all.filter(each => each.actorType === 'npc');
    expect(new Set(wargs.map(warg => warg.actorId)).size).toBe(2);
    const [warg1, warg2] = ['Warg 1', 'Warg 2'].map(name => all.find(each => each.actorName === name)!);
    const beorn = all.find(each => each.actorId === 'beorn')!;
    expect(warg1).toMatchObject({
      actorType: 'npc',
      npcId: 'warg',
      size: 0,
      raceName: 'animal',
      level: 2,
      factionId: 'environment',
      // Dies when its damage reaches its 60 death hits: below -19 hits.
      hp: { max: 40, current: 40, deathThreshold: 19 },
      defense: { bd: 20, at: 3, headAt: 3, bodyAt: 3, shield: null },
      initiative: { base: 4 },
      movement: { bmr: 30, maxPace: 'dash', baseDifficulty: 'c' },
      attacks: [{ attackName: 'bite-1', baseBo: 50, attackTable: 'bite', fumbleTable: 'animals', attackSize: 0, fumble: 1, type: 'melee' }],
    });
    expect(warg1.characterId).toBeUndefined();
    expect(warg1.resistances).toContainEqual({ resistance: 'physical', totalBonus: 15 });

    // Initiative: the roll plus the bonus of the stat block.
    for (const [actorRound, value] of [
      [warg1, 15],
      [warg2, 9],
      [beorn, 12],
    ] as const) {
      const declared = await as('owner').patch(`/v1/actor-rounds/${actorRound.id}/initiative`, { roll: value });
      expect(declared.status).toBe(200);
      expect((declared.body as ActorRoundBody).initiative.total).toBe(actorRound.initiative.base + value);
    }

    expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
    const bite = await declareAttack(gameId, warg1.actorId);
    const clumsyBite = await declareAttack(gameId, warg2.actorId);
    const blow = await declareAttack(gameId, 'beorn');
    // An attack takes 2 AP: phases 1 and 2.
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);

    // The first warg bites Beorn: 12 hits and a critical of 6.
    await prepare(bite, 'bite-1', 'beorn', 50);
    expect((await roll(bite, 'bite-1', 70)).status).toBe('pending_critical_roll');
    expect(e2e.world.lookups.attack.at(-1)).toMatchObject({ attackTable: 'bite', armor: 1 });
    const critical = await as('owner').patch(`/v1/actions/${bite.id}/attack/critical-roll`, {
      attackName: 'bite-1',
      criticalKey: 's_c_1',
      roll: 50,
    });
    expect(critical.status).toBe(200);
    await apply(bite);
    expect((await readRound(beorn.id)).hp.current).toBe(50 - 18);

    // The second one fumbles on an unmodified 01, on the fumble table of its attack.
    await prepare(clumsyBite, 'bite-1', 'beorn', 50);
    expect((await roll(clumsyBite, 'bite-1', 1)).status).toBe('pending_fumble_roll');
    const fumbled = await as('owner').patch(`/v1/actions/${clumsyBite.id}/attack/fumble-roll`, {
      attackName: 'bite-1',
      fumbleRoll: 40,
    });
    expect(fumbled.status).toBe(200);
    expect(e2e.world.lookups.fumble.at(-1)).toMatchObject({ fumbleTable: 'animals', roll: 40 });
    await apply(clumsyBite);
    expect((await readRound(beorn.id)).hp.current).toBe(50 - 18);

    // Beorn strikes the first warg against its DB and AT, for its 60 death hits: it dies.
    await prepare(blow, 'mainHand', warg1.actorId, 60);
    e2e.world.attackEntry = new AttackTableEntry('60', 60, undefined, undefined);
    try {
      await roll(blow, 'mainHand', 80);
    } finally {
      e2e.world.attackEntry = new AttackTableEntry('12CS', 12, 'S', 'C');
    }
    expect(e2e.world.lookups.attack.at(-1)).toMatchObject({ attackTable: 'arming-sword', armor: 3 });
    await apply(blow);
    const dead = await readRound(warg1.id);
    expect(dead.hp.current).toBe(40 - 60);
    expect(dead.effects.map(effect => effect.status)).toContain('dead');
  });

  it('kills an NPC when its damage reaches its death hits, not before', async () => {
    const created = await as('owner').post('/v1/tactical-games', {
      strategicGameId: 'sg-1',
      name: 'Beorn hall',
      factions: ['faction-1'],
      environmentFaction: { npcs: [{ npcId: 'warg' }] },
    });
    const gameId = (created.body as { id: string }).id;
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
    const [warg] = await rounds(gameId);
    const hurt = await as('owner').patch(`/v1/actor-rounds/${warg.id}/hp`, { dmg: 59 });
    expect(hurt.status).toBe(200);
    expect((hurt.body as ActorRoundBody).effects.map(effect => effect.status)).toEqual(['unconscious']);
    const killed = await as('owner').patch(`/v1/actor-rounds/${warg.id}/hp`, { dmg: 1 });
    expect((killed.body as ActorRoundBody).effects.map(effect => effect.status)).toContain('dead');
  });

  it('lets an NPC stand up with its Acrobatics ranks, and keeps a round 2 built from round 1', async () => {
    const created = await as('owner').post('/v1/tactical-games', {
      strategicGameId: 'sg-1',
      name: 'Eyrie',
      factions: ['faction-1'],
      environmentFaction: { npcs: [{ npcId: 'warg' }] },
    });
    const gameId = (created.body as { id: string }).id;
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/initiatives/randomize`)).status).toBe(200);
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
    const [warg] = await rounds(gameId);
    const standUp = await as('owner').post('/v1/actions', { gameId, actorId: warg.actorId, actionType: 'stand_up', phaseStart: 1 });
    expect(standUp.status).toBe(201);
    // The stat block gives Acrobatics ranks: standing up takes 1 AP.
    expect(standUp.body).toMatchObject({ apProfile: { min: 1, max: 1 } });

    for (let i = 0; i < 4; i++) {
      expect((await as('owner').post(`/v1/tactical-games/${gameId}/phases/start`)).status).toBe(200);
    }
    expect((await as('owner').post(`/v1/tactical-games/${gameId}/rounds/start`)).status).toBe(200);
    const [next] = await rounds(gameId, 2);
    expect(next).toMatchObject({ actorId: warg.actorId, actorType: 'npc', npcId: 'warg', hp: { max: 40, deathThreshold: 19 } });
  });
});
