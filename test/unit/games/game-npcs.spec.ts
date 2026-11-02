import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RemoveDeletedFactionCommand } from '../../../src/modules/games/application/cqrs/commands/remove-deleted-faction.command.js';
import { RemoveDeletedFactionHandler } from '../../../src/modules/games/application/cqrs/handlers/remove-deleted-faction.handler.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import { GameNpcsService, type GameNpcsContext } from '../../../src/modules/games/application/services/game-npcs.service.js';
import { Game } from '../../../src/modules/games/domain/aggregates/game.js';
import { Actor } from '../../../src/modules/games/domain/value-objects/actor.vo.js';
import { EnvironmentFactions } from '../../../src/modules/games/domain/value-objects/environment-faction.vo.js';
import { ApiRealmAdapter } from '../../../src/modules/games/infrastructure/api-clients/api.realm.adapter.js';
import { StrategicGameKafkaConsumer } from '../../../src/modules/games/interfaces/messaging/kafka.strategic-game.consumer.js';
import type { Npc } from '../../../src/modules/npcs/application/ports/npc.port.js';
import { ApiNpcAdapter } from '../../../src/modules/npcs/infrastructure/api-clients/api.npc.adapter.js';
import { HttpClient } from '../../../src/modules/shared/infrastructure/http/http-client.js';
import type { TokenService } from '../../../src/modules/shared/infrastructure/security/token.service.js';
import type { StrategicFaction } from '../../../src/modules/strategic/application/ports/faction.port.js';
import { FactionApiClient } from '../../../src/modules/strategic/infrastructure/api-clients/api.faction.adapter.js';
import type { CommandBus } from '@nestjs/cqrs';
import type { KafkaContext } from '@nestjs/microservices';

const npc = (id: string, overrides: Partial<Npc> = {}) =>
  ({ id, realmId: 'realm-1', accessType: 'public', name: id, owner: 'gm', ...overrides }) as Npc;

const context = (overrides: Partial<GameNpcsContext> = {}): GameNpcsContext => ({
  strategicGameId: 'sg-1',
  realmId: 'realm-1',
  gameOwner: 'gm',
  factionIds: ['f-1'],
  environmentName: 'Environment',
  takenNames: [],
  ...overrides,
});

const service = (npcs: Npc[], factions: StrategicFaction[] = [], realms: { id: string; generic?: boolean }[] = []) => {
  const npcPort = { findById: vi.fn((id: string) => Promise.resolve(npcs.find(each => each.id === id))) };
  const factionPort = { findById: vi.fn((id: string) => Promise.resolve(factions.find(each => each.id === id) ?? null)) };
  const realmPort = {
    findById: vi.fn((id: string) => Promise.resolve(realms.map(each => ({ name: id, ...each })).find(each => each.id === id) ?? null)),
  };
  return {
    service: new GameNpcsService(npcPort, factionPort, realmPort),
    npcPort,
    factionPort,
    realmPort,
  };
};

const faction = (id: string, overrides: Partial<StrategicFaction> = {}): StrategicFaction => ({
  id,
  gameId: 'sg-1',
  name: `Faction ${id}`,
  owner: 'player',
  npcs: [],
  ...overrides,
});

describe('GameNpcsService', () => {
  it('makes one actor per specimen, owned by the owner of the faction, reading each NPC and faction once', async () => {
    const { service: npcs, npcPort, factionPort } = service([npc('wolf', { name: 'Wolf' })], [faction('f-1')]);
    const { actors, environmentNpcs } = await npcs.toActors(context(), [
      { npcId: 'wolf', factionId: 'f-1', count: 2 },
      { npcId: 'wolf', factionId: 'f-1', name: 'Alpha' },
    ]);
    expect(actors.map(actor => [actor.name, actor.npcId, actor.owner, actor.faction.name, actor.type])).toEqual([
      ['Wolf 1', 'wolf', 'player', 'Faction f-1', 'npc'],
      ['Wolf 2', 'wolf', 'player', 'Faction f-1', 'npc'],
      ['Alpha', 'wolf', 'player', 'Faction f-1', 'npc'],
    ]);
    expect(environmentNpcs).toEqual([]);
    expect(npcPort.findById).toHaveBeenCalledTimes(1);
    expect(factionPort.findById).toHaveBeenCalledTimes(1);
  });

  it('gives the environment NPCs to the game master, and takes the NPCs of the factions', async () => {
    const { service: npcs } = service(
      [npc('wolf', { name: 'Wolf' }), npc('guard', { name: 'Guard' })],
      [faction('f-1', { npcs: [{ id: 'e-1', npcId: 'guard', name: 'Sentry', count: 1, notes: null }] })],
    );
    const { actors, environmentNpcs } = await npcs.toActors(
      context({ environmentName: 'Forest', takenNames: ['Wolf'] }),
      [{ npcId: 'wolf', factionId: 'environment' }],
      ['f-1', 'unknown', 'environment'],
    );
    expect(actors.map(actor => [actor.name, actor.owner, actor.faction.id, actor.faction.name])).toEqual([
      ['Sentry', 'player', 'f-1', 'Faction f-1'],
      ['Wolf 1', 'gm', 'environment', 'Forest'],
    ]);
    expect(environmentNpcs).toEqual([{ npcId: 'wolf', count: 1, name: 'Wolf' }]);
  });

  it('takes the NPC of a generic realm, and rejects one of another realm', async () => {
    const { service: npcs } = service(
      [npc('core', { realmId: 'realm-core' }), npc('other', { realmId: 'realm-2' })],
      [],
      [{ id: 'realm-core', generic: true }, { id: 'realm-2' }],
    );
    await expect(npcs.toActors(context(), [{ npcId: 'core', factionId: 'environment' }])).resolves.toMatchObject({ actors: [{}] });
    await expect(npcs.toActors(context(), [{ npcId: 'other', factionId: 'environment' }])).rejects.toMatchObject({ code: 'err-npc-realm' });
  });

  it.each([
    ['an unknown NPC', { npcId: 'nope', factionId: 'f-1' }, 'err-npc-not-found'],
    ['a faction not in the game', { npcId: 'wolf', factionId: 'f-2' }, 'err-npc-faction-not-in-game'],
    ['a faction strategic does not know', { npcId: 'wolf', factionId: 'f-3' }, 'err-faction-not-found'],
    ['a faction of another campaign', { npcId: 'wolf', factionId: 'f-4' }, 'err-npc-faction-not-in-game'],
    ['a private NPC of another user', { npcId: 'secret', factionId: 'f-1' }, 'err-npc-not-readable'],
    ['no specimens', { npcId: 'wolf', factionId: 'f-1', count: 0 }, 'err-npc-count'],
  ])('rejects %s', async (_, request, code) => {
    const { service: npcs } = service(
      [npc('wolf'), npc('secret', { accessType: 'private', owner: 'someone' })],
      [faction('f-1'), faction('f-4', { gameId: 'sg-2' })],
    );
    await expect(npcs.toActors(context({ factionIds: ['f-1', 'f-3', 'f-4'] }), [request])).rejects.toMatchObject({ code });
  });

  it('takes a private NPC of the owner of the faction', async () => {
    const { service: npcs } = service([npc('secret', { accessType: 'private', owner: 'player' })], [faction('f-1')]);
    await expect(npcs.toActors(context(), [{ npcId: 'secret', factionId: 'f-1' }])).resolves.toMatchObject({ actors: [{}] });
  });

  it('turns the NPCs sent as actors into one specimen each, and requires their faction', () => {
    expect(
      GameNpcsService.legacyRequests([
        { id: 'aragorn', type: 'character', factionId: undefined },
        { id: 'orc', type: 'npc', factionId: 'f-1' },
      ]),
    ).toEqual([{ npcId: 'orc', factionId: 'f-1', count: 1 }]);
    expect(() => GameNpcsService.legacyRequests([{ id: 'orc', type: 'npc', factionId: undefined }])).toThrow('must have a faction');
  });
});

const game = (overrides: Partial<Parameters<typeof Game.fromProps>[0]> = {}) =>
  Game.fromProps({
    id: 'game-1',
    strategicGameId: 'sg-1',
    name: 'Moria',
    status: 'created',
    round: 0,
    phase: 'not_started',
    factions: ['f-1'],
    actors: [],
    owner: 'gm',
    createdAt: new Date('2026-01-01'),
    ...overrides,
  });

const wolf = (id: string, name: string) =>
  Actor.fromProps({ id, npcId: 'wolf', name, faction: { id: 'environment', name: 'Environment' }, type: 'npc', owner: 'gm' });

describe('Game environment faction', () => {
  it('creates the environment with its first NPCs, merges the next ones and lists it among the factions', () => {
    const tactical = game();
    tactical.addActors([wolf('w-1', 'Wolf')], [{ npcId: 'wolf', count: 1, name: 'Wolf' }]);
    tactical.addActors([wolf('w-2', 'Wolf 1')], [{ npcId: 'wolf', count: 1, name: 'Wolf' }]);
    expect(tactical.environmentFaction).toEqual({
      factionId: 'environment',
      name: 'Environment',
      npcs: [{ npcId: 'wolf', count: 2, name: 'Wolf' }],
    });
    expect(tactical.factions).toEqual(['f-1', 'environment']);
  });

  it('rejects the environment as a faction of the game', () => {
    expect(() => game().addFactions(['environment'])).toThrow('reserved');
  });

  it('empties the environment when its faction is deleted', () => {
    const tactical = game({ factions: ['f-1', 'environment'], actors: [wolf('w-1', 'Wolf')] });
    tactical.environmentFaction = EnvironmentFactions.create('Forest', [{ npcId: 'wolf', count: 1, name: 'Wolf' }]);
    tactical.deleteFactions(['environment']);
    expect(tactical.actors).toEqual([]);
    expect(tactical.environmentFaction.npcs).toEqual([]);
  });

  it('renames the environment and its actors, and only while the game is created', () => {
    const tactical = game({ factions: ['f-1', 'environment'], actors: [wolf('w-1', 'Wolf')] });
    tactical.update(undefined, undefined, undefined, undefined, ' Forest ');
    expect(tactical.environmentFaction?.name).toBe('Forest');
    expect(tactical.actors[0].faction).toEqual({ id: 'environment', name: 'Forest' });
    expect(() => tactical.renameEnvironmentFaction(' ')).toThrow('needs a name');
    const started = game({ status: 'in_progress' });
    expect(() => started.renameEnvironmentFaction('Forest')).toThrow("not in 'created' status");
  });

  it('takes a specimen off the entry it is named after', () => {
    const npcs = [
      { npcId: 'wolf', count: 2, name: 'Wolf' },
      { npcId: 'wolf', count: 1, name: 'Alpha' },
    ];
    expect(EnvironmentFactions.removeSpecimen(npcs, 'wolf', 'Wolf 2')).toEqual([
      { npcId: 'wolf', count: 1, name: 'Wolf' },
      { npcId: 'wolf', count: 1, name: 'Alpha' },
    ]);
    expect(EnvironmentFactions.removeSpecimen(npcs, 'wolf', 'Renamed')).toEqual([{ npcId: 'wolf', count: 2, name: 'Wolf' }]);
    expect(EnvironmentFactions.removeSpecimen(npcs, 'other', 'Other')).toEqual(npcs);
  });

  it('keeps the actor equality on the NPC', () => {
    expect(wolf('w-1', 'Wolf').equals(wolf('w-1', 'Wolf'))).toBe(true);
    expect(wolf('w-1', 'Wolf').equals(Actor.fromProps({ ...wolf('w-1', 'Wolf'), npcId: 'bear' }))).toBe(false);
  });
});

describe('RemoveDeletedFactionHandler', () => {
  it('takes the faction and its actors out of the created games', async () => {
    const tactical = game({
      factions: ['f-1', 'f-2'],
      actors: [Actor.fromProps({ id: 'g-1', npcId: 'guard', name: 'Guard', faction: { id: 'f-2', name: 'F2' }, type: 'npc', owner: 'p' })],
    });
    const repository = { findCreatedByFaction: vi.fn(() => Promise.resolve([tactical])), update: vi.fn((g: Game) => Promise.resolve(g)) };
    const publisher = { publish: vi.fn(() => Promise.resolve()) };
    await new RemoveDeletedFactionHandler(repository as unknown as GameRepository, publisher).execute(
      new RemoveDeletedFactionCommand('f-2'),
    );
    expect(repository.findCreatedByFaction).toHaveBeenCalledWith('f-2');
    expect(tactical.factions).toEqual(['f-1']);
    expect(tactical.actors).toEqual([]);
    expect(publisher.publish).toHaveBeenCalled();
  });

  it('is dispatched by the faction deleted event of strategic', async () => {
    const execute = vi.fn(() => Promise.resolve());
    const consumer = new StrategicGameKafkaConsumer({ execute } as unknown as CommandBus);
    const kafka = { getTopic: () => 'internal.rmu-strategic.faction.deleted.v1' } as unknown as KafkaContext;
    await consumer.handleFactionDeleted({ data: { id: 'f-2' } }, kafka);
    await consumer.handleFactionDeleted({ data: {} }, kafka);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(new RemoveDeletedFactionCommand('f-2'));
  });
});

describe('API clients of spec 055', () => {
  const tokenService = { getToken: () => Promise.resolve('token') } as unknown as TokenService;
  const config = new ConfigService({
    RMU_API_STRATEGIC_URI: 'http://strategic/v1',
    RMU_API_CORE_URI: 'http://core/v1',
    RMU_API_NPCS_URI: 'http://npcs/v1',
  });
  const httpClient = new HttpClient(config);
  const answer = (status: number, body: unknown) => {
    const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() =>
      Promise.resolve(new Response(JSON.stringify(body), { status })),
    );
    vi.stubGlobal('fetch', fetch);
    return fetch;
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads a faction, a realm and an NPC', async () => {
    const fetch = answer(200, { id: 'x' });
    expect(await new FactionApiClient(tokenService, httpClient, config).findById('f 1')).toEqual({ id: 'x' });
    expect(await new ApiRealmAdapter(tokenService, httpClient, config).findById('r-1')).toEqual({ id: 'x' });
    expect(await new ApiNpcAdapter(tokenService, httpClient, config).findById('n-1')).toEqual({ id: 'x' });
    expect(fetch.mock.calls.map(call => call[0])).toEqual([
      'http://strategic/v1/factions/f%201',
      'http://core/v1/realms/r-1',
      'http://npcs/v1/npcs/n-1',
    ]);
  });

  it('answers null or undefined to what the other APIs do not find, and fails on other errors', async () => {
    answer(404, { message: 'not found' });
    expect(await new FactionApiClient(tokenService, httpClient, config).findById('f-1')).toBeNull();
    expect(await new ApiRealmAdapter(tokenService, httpClient, config).findById('r-1')).toBeNull();
    expect(await new ApiNpcAdapter(tokenService, httpClient, config).findById('n-1')).toBeUndefined();
    answer(500, { message: 'boom' });
    await expect(new FactionApiClient(tokenService, httpClient, config).findById('f-1')).rejects.toBeDefined();
    await expect(new ApiRealmAdapter(tokenService, httpClient, config).findById('r-1')).rejects.toBeDefined();
  });
});
