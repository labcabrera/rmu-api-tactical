import { getConnectionToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Connection } from 'mongoose';
import request from 'supertest';
import { configureHttp } from '../../../src/bootstrap/http.js';
import { ATTACK_TABLE_PORT, type AttackTableLookupRequest } from '../../../src/modules/actions/application/ports/attack-table.port.js';
import {
  CRITICAL_TABLE_PORT,
  type CriticalTableLookupRequest,
} from '../../../src/modules/actions/application/ports/critical-table.port.js';
import { FUMBLE_TABLE_PORT, type FumbleTableLookupRequest } from '../../../src/modules/actions/application/ports/fumble-table.port.js';
import { MANEUVER_PORT } from '../../../src/modules/actions/application/ports/maneuver.port.js';
import { SKILL_CATALOG_PORT } from '../../../src/modules/actions/application/ports/skill-catalog.port.js';
import { AttackTableEntry, Fumble } from '../../../src/modules/actions/domain/value-objects/action-attack.vo.js';
import { CriticalResult } from '../../../src/modules/actions/domain/value-objects/critical-result.vo.js';
import {
  DEFAULT_MANEUVER_PROFILE,
  type SkillManeuverProfile,
} from '../../../src/modules/actions/domain/value-objects/maneuver-profile.vo.js';
import { HEALING_TABLES_PORT } from '../../../src/modules/actor-rounds/application/ports/healing-tables.port.js';
import type { TreatmentTables } from '../../../src/modules/actor-rounds/domain/value-objects/treatment-difficulty.vo.js';
import { PSYCHOLOGY_TABLES_PORT } from '../../../src/modules/psychology/application/ports/psychology-tables.port.js';
import type { PsychologyTables } from '../../../src/modules/psychology/domain/value-objects/psychology-tables.vo.js';
import { PSYCHOLOGY_TABLES } from '../../fixtures/psychology-tables.js';
import { NPC_PORT, type Npc } from '../../../src/modules/games/application/ports/npc.port.js';
import {
  DOMAIN_EVENT_PUBLISHER,
  type DomainEventPublisher,
} from '../../../src/modules/shared/application/ports/domain-event-publisher.port.js';
import type { DomainEvent } from '../../../src/modules/shared/domain/events/domain-event.js';
import { KafkaProducerService } from '../../../src/modules/shared/infrastructure/messaging/kafka-producer.service.js';
import { CHARACTER_PORT, type Character } from '../../../src/modules/strategic/application/ports/character.port.js';
import { ITEM_PORT, type StrategicItem } from '../../../src/modules/strategic/application/ports/item.port.js';
import { STRATEGIC_GAME_PORT, type StrategicGame } from '../../../src/modules/strategic/application/ports/strategic-game.port.js';
import {
  TACTICAL_OUTCOME_PORT,
  type TacticalOutcomeRequest,
} from '../../../src/modules/strategic/application/ports/tactical-outcome.port.js';
import { CHARACTER_MAGIC_PORT, type CharacterSpellcasting } from '../../../src/modules/strategic/application/ports/character-magic.port.js';
import {
  SPELLCASTING_TABLES_PORT,
  type SpellFailureLookup,
} from '../../../src/modules/actions/application/ports/spellcasting-tables.port.js';
import type { SpellcastingTables } from '../../../src/modules/actions/domain/services/spell-casting.rules.js';
import { AUDIENCE, ISSUER, LocalJwks } from './jwks.js';

export type Server = Parameters<typeof request>[0];

/** The users of the suite, by the Keycloak groups in their token. */
export const USERS = {
  admin: { sub: 'e2e-admin', groups: ['rmu-admin'] },
  owner: { sub: 'e2e-owner', groups: ['rmu-user'] },
  other: { sub: 'e2e-other', groups: ['rmu-user'] },
  noRole: { sub: 'e2e-guest', groups: [] as string[] },
} as const;

export type UserName = keyof typeof USERS;

/** What the other APIs answer, by id, and what the suite saw going out. Tests add to it before calling. */
export type World = {
  strategicGames: Map<string, StrategicGame>;
  characters: Map<string, Character>;
  items: Map<string, StrategicItem[]>;
  npcs: Map<string, Npc>;
  /** The attack table answers this entry to every lookup. */
  attackEntry: AttackTableEntry;
  critical: CriticalResult;
  fumble: Fumble;
  /** Treatment tables of core's healing tables (workspace spec 022); null is a core without them. */
  treatmentTables: TreatmentTables | null;
  /** Psychology tables of core (workspace spec 022), with made-up numbers. */
  psychologyTables: PsychologyTables;
  /** Maneuver profiles of core by skill; the default one for the rest. */
  skillProfiles: Map<string, Partial<SkillManeuverProfile>>;
  lookups: { attack: AttackTableLookupRequest[]; critical: CriticalTableLookupRequest[]; fumble: FumbleTableLookupRequest[] };
  outcomes: { characterId: string; request: TacticalOutcomeRequest }[];
  /** Spellbooks of strategic by character (spec 030), and the power points the suite spent. */
  spellcasting: Map<string, CharacterSpellcasting>;
  powerSpent: { characterId: string; amount: number }[];
  /** Table 4-2 and the answer of every spell failure lookup, with made-up numbers. */
  spellcastingTables: SpellcastingTables;
  spellFailure: SpellFailureLookup;
  spellFailureLookups: { realm: string; type: string; roll: number }[];
  /** Events published, as `<aggregateType>.<eventType>`. */
  events: { aggregateType: string; event: DomainEvent<unknown> }[];
};

export type E2eApp = {
  app: NestExpressApplication;
  server: Server;
  jwks: LocalJwks;
  world: World;
  auth: (user: UserName) => string;
  connection: Connection;
  stop: () => Promise<void>;
};

const newWorld = (): World => ({
  strategicGames: new Map(),
  characters: new Map(),
  items: new Map(),
  npcs: new Map(),
  attackEntry: new AttackTableEntry('12CS', 12, 'S', 'C'),
  critical: new CriticalResult('Strike to the leg.', 6, 'leg', [], undefined),
  fumble: new Fumble('completed', 'Off balance.', undefined, 0, []),
  treatmentTables: null,
  psychologyTables: PSYCHOLOGY_TABLES,
  skillProfiles: new Map(),
  lookups: { attack: [], critical: [], fumble: [] },
  outcomes: [],
  events: [],
  spellcasting: new Map(),
  powerSpent: [],
  spellcastingTables: SPELLCASTING_TABLES,
  spellFailure: { text: 'The spell fizzles.', pp: 'half-down' },
  spellFailureLookups: [],
});

/** Made-up Table 4-2 (not the book's numbers): one column per realm and per hybrid. */
const column = (essence: number | null) => ({
  channeling: essence,
  essence,
  mentalism: essence,
  'channeling-essence': essence,
  'channeling-mentalism': essence,
  'essence-mentalism': essence,
});
const SPELLCASTING_TABLES: SpellcastingTables = {
  columns: Object.keys(column(0)),
  subtlety: { elemental: column(-7), force: column(-6), informational: column(-1), utility: column(-2) },
  hands: { none: column(-11), one: column(-3), two: column(0) },
  voice: { none: column(-9), whisper: column(-4), normal: column(0), shout: column(2) },
  helmet: { light: column(-13), medium: column(-17), heavy: column(-19) },
  armor: { leather: column(0), metal: { ...column(0), essence: { perEncumbrancePercent: -2 } } },
  fastCastingPerAp: -25,
  overcastingPerLevel: -20,
  preparation: { perRound: 10, max: 20 },
};

/** The outbound ports of the API, answering from the world instead of calling core, strategic, npcs and attack-tables. */
function fakePorts(world: World) {
  const publisher: DomainEventPublisher = {
    publish: (aggregateType, ...events) => {
      world.events.push(...events.map(event => ({ aggregateType, event })));
      return Promise.resolve();
    },
  };
  return new Map<symbol, unknown>([
    [DOMAIN_EVENT_PUBLISHER, publisher],
    [STRATEGIC_GAME_PORT, { findById: (id: string) => Promise.resolve(world.strategicGames.get(id) ?? null) }],
    [
      CHARACTER_PORT,
      {
        findById: (id: string) => Promise.resolve(world.characters.get(id)),
        findByGameId: (gameId: string) => Promise.resolve([...world.characters.values()].filter(c => c.gameId === gameId)),
      },
    ],
    [ITEM_PORT, { findByCharacterId: (id: string) => Promise.resolve(world.items.get(id) ?? []) }],
    [NPC_PORT, { findById: (id: string) => Promise.resolve(world.npcs.get(id)) }],
    [
      ATTACK_TABLE_PORT,
      {
        lookup: (lookup: AttackTableLookupRequest) => {
          world.lookups.attack.push(lookup);
          return Promise.resolve(world.attackEntry);
        },
      },
    ],
    [
      CRITICAL_TABLE_PORT,
      {
        lookup: (lookup: CriticalTableLookupRequest) => {
          world.lookups.critical.push(lookup);
          return Promise.resolve(world.critical);
        },
      },
    ],
    [
      FUMBLE_TABLE_PORT,
      {
        lookup: (lookup: FumbleTableLookupRequest) => {
          world.lookups.fumble.push(lookup);
          return Promise.resolve(world.fumble);
        },
      },
    ],
    [
      MANEUVER_PORT,
      {
        percent: (roll: number) => Promise.resolve({ percent: Math.min(roll, 100), critical: null, message: 'Partial' }),
        absolute: (roll: number) => Promise.resolve({ result: roll > 100 ? 'success' : 'failure', message: 'Done', effects: [] }),
        endurance: (roll: number) =>
          Promise.resolve({
            result: roll > 50 ? 'success' : 'failure',
            message: 'Tired',
            fatigue: roll > 50 ? 0 : 10,
            hitPoints: 0,
            bonus: 0,
          }),
      },
    ],
    [
      SKILL_CATALOG_PORT,
      {
        findSkill: (skillId: string) =>
          Promise.resolve({
            id: skillId,
            categoryId: 'e2e',
            maneuver: { ...DEFAULT_MANEUVER_PROFILE, ...world.skillProfiles.get(skillId) },
          }),
        findManeuverModifiers: () => Promise.resolve([]),
      },
    ],
    [PSYCHOLOGY_TABLES_PORT, { find: () => Promise.resolve(world.psychologyTables) }],
    [
      CHARACTER_MAGIC_PORT,
      {
        findSpellcasting: (id: string) => Promise.resolve(world.spellcasting.get(id)),
        spendPower: (characterId: string, amount: number) => {
          const book = world.spellcasting.get(characterId);
          if (book?.power) book.power.current -= amount;
          world.powerSpent.push({ characterId, amount });
          return Promise.resolve();
        },
      },
    ],
    [
      SPELLCASTING_TABLES_PORT,
      {
        findModifiers: () => Promise.resolve(world.spellcastingTables),
        findFailure: (realm: string, type: string, roll: number) => {
          world.spellFailureLookups.push({ realm, type, roll });
          return Promise.resolve(world.spellFailure);
        },
      },
    ],
    [HEALING_TABLES_PORT, { treatmentTables: () => Promise.resolve(world.treatmentTables) }],
    [
      TACTICAL_OUTCOME_PORT,
      {
        apply: (characterId: string, outcome: TacticalOutcomeRequest) => {
          world.outcomes.push({ characterId, request: outcome });
          return Promise.resolve();
        },
      },
    ],
  ]);
}

/**
 * Boots the whole AppModule as main.ts does (configureHttp) against an in-memory Mongo and a local JWKS. The ports of
 * the other APIs (core, strategic, npcs, attack-tables) and the event publisher are replaced by in-memory fakes, and
 * the Kafka producer by a no-op. AppModule is imported after setting the environment, because ConfigModule.forRoot()
 * reads it when the module is evaluated.
 */
export async function startApp(env: Record<string, string> = {}): Promise<E2eApp> {
  const mongo = await MongoMemoryServer.create();
  const jwks = new LocalJwks();
  await jwks.start();
  Object.assign(process.env, {
    RMU_MONGO_TACTICAL_URI: mongo.getUri('rmu-tactical-e2e'),
    RMU_IAM_JWK_URI: jwks.uri,
    RMU_IAM_ISSUER_URI: ISSUER,
    RMU_IAM_AUDIENCE: AUDIENCE,
    RMU_IAM_TOKEN_URI: 'http://127.0.0.1:1/token',
    RMU_IAM_CLIENT_ID: 'rmu-api-tactical-e2e',
    RMU_IAM_CLIENT_SECRET: 'e2e',
    RMU_KAFKA_BROKERS: 'localhost:9092',
    RMU_KAFKA_CLIENT_ID: 'rmu-api-tactical-e2e',
    RMU_THROTTLE_LIMIT: '0',
    RMU_CORS_ORIGINS: '',
    RMU_KAFKA_CONSUMER_GROUP_ID: 'rmu-api-tactical-e2e',
    RMU_API_CORE_URI: 'http://127.0.0.1:1/v1',
    RMU_API_STRATEGIC_URI: 'http://127.0.0.1:1/v1',
    RMU_API_ITEMS_URI: 'http://127.0.0.1:1/v1',
    RMU_API_NPCS_URI: 'http://127.0.0.1:1/v1',
    RMU_API_ATTACK_TABLES_URI: 'http://127.0.0.1:1/v1',
    ...env,
  });

  const world = newWorld();
  const { AppModule } = await import('../../../src/app.module.js');
  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(KafkaProducerService)
    .useValue({ emit: () => Promise.resolve() });
  for (const [token, fake] of fakePorts(world)) builder = builder.overrideProvider(token).useValue(fake);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: ['error'] });
  configureHttp(app);
  await app.init();

  return {
    app,
    server: app.getHttpServer() as Server,
    jwks,
    world,
    auth: user => `Bearer ${jwks.token(USERS[user])}`,
    connection: app.get<Connection>(getConnectionToken()),
    stop: async () => {
      await app.close();
      await jwks.stop();
      await mongo.stop();
    },
  };
}

/** The ids of a page response. */
export const ids = (body: unknown) => (body as { content: { id: string }[] }).content.map(item => item.id);

/** A strategic character with one melee attack, as the strategic API returns it. */
export const character = (id: string, overrides: Partial<Character> = {}): Character =>
  ({
    id,
    gameId: 'sg-1',
    faction: { id: 'faction-1', name: 'Fellowship' },
    name: id,
    info: { raceName: 'Human', raceId: 'human', sizeId: 'medium' },
    experience: { level: 3 },
    movement: { baseMovementRate: 20, maxPace: 'dash' },
    defense: { defensiveBonus: 10, armor: { at: 1, bodyAt: 1, headAt: 1, armsAt: 1, legsAt: 1 }, shield: null, protect: 0 },
    hp: { max: 50, current: 50 },
    initiative: { totalBonus: 5 },
    skills: [],
    traits: [],
    items: [],
    equipment: { slots: {}, maneuverPenalty: 0, encumbrancePenalty: 0, movementBaseDifficulty: 'm' },
    attacks: [
      {
        attackName: 'mainHand',
        attackTable: 'arming-sword',
        sizeAdjustment: 0,
        fumble: 3,
        bo: 60,
        type: 'melee',
        meleeRange: 1,
        ranges: null,
        fumbleTable: 'melee-one-hand',
        skillId: 'melee-weapon@blade',
      },
    ],
    imageUrl: undefined,
    owner: USERS.owner.sub,
    ...overrides,
  }) as unknown as Character;
