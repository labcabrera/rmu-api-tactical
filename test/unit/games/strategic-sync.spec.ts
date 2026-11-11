import type { CommandBus } from '@nestjs/cqrs';
import type { KafkaContext } from '@nestjs/microservices';
import { describe, expect, it, vi } from 'vitest';
import { SyncFactionPlayersCommand } from '../../../src/modules/games/application/cqrs/commands/sync-faction-players.command.js';
import { SyncStrategicMembersCommand } from '../../../src/modules/games/application/cqrs/commands/sync-strategic-members.command.js';
import { SyncFactionPlayersHandler } from '../../../src/modules/games/application/cqrs/handlers/sync-faction-players.handler.js';
import { SyncStrategicMembersHandler } from '../../../src/modules/games/application/cqrs/handlers/sync-strategic-members.handler.js';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port.js';
import { factionPlayersOf } from '../../../src/modules/games/application/services/faction-players.js';
import { Game } from '../../../src/modules/games/domain/aggregates/game.js';
import { StrategicMembers } from '../../../src/modules/games/domain/value-objects/strategic-member.vo.js';
import { StrategicGameKafkaConsumer } from '../../../src/modules/games/interfaces/messaging/kafka.strategic-game.consumer.js';
import type { StrategicFaction } from '../../../src/modules/strategic/application/ports/faction.port.js';

const kafka = (topic: string) => ({ getTopic: () => topic }) as unknown as KafkaContext;

const consumer = () => {
  const execute = vi.fn(() => Promise.resolve());
  return { execute, consumer: new StrategicGameKafkaConsumer({ execute } as unknown as CommandBus) };
};

// Workspace spec 072, decision 13 and contract 24.
describe('StrategicGameKafkaConsumer, members and faction players', () => {
  const members = [
    { userId: 'm', userName: 'Master', role: 'master', joinedAt: '2026-11-03T00:00:00Z' },
    { userId: 'p', userName: 'Player', role: 'player', joinedAt: '2026-11-03T00:00:00Z' },
    { userId: 's', userName: 'Spectator', role: 'spectator', joinedAt: '2026-11-03T00:00:00Z' },
    { userId: 'x', role: 'owner' },
    { role: 'player' },
  ];

  it.each(['created', 'updated'] as const)('dispatches the members and the owner of game.%s', async kind => {
    const { execute, consumer: c } = consumer();
    const handle = kind === 'created' ? c.handleStrategicGameCreated.bind(c) : c.handleStrategicGameUpdated.bind(c);
    await handle({ data: { id: 'sg-1', owner: 'o', members } }, kafka(`internal.rmu-strategic.game.${kind}.v1`));
    expect(execute).toHaveBeenCalledWith(
      new SyncStrategicMembersCommand('sg-1', 'o', [
        { userId: 'm', role: 'master' },
        { userId: 'p', role: 'player' },
        { userId: 's', role: 'spectator' },
      ]),
    );
  });

  it('keeps the members of an event without them, and ignores an event without id', async () => {
    const { execute, consumer: c } = consumer();
    await c.handleStrategicGameUpdated({ data: { id: 'sg-1', owner: 'o' } }, kafka('t'));
    expect(execute).toHaveBeenCalledWith(new SyncStrategicMembersCommand('sg-1', 'o', undefined));
    execute.mockClear();
    await c.handleStrategicGameUpdated({ data: { id: 'sg-1' } }, kafka('t'));
    await c.handleStrategicGameUpdated({ data: {} }, kafka('t'));
    await c.handleStrategicGameUpdated({}, kafka('t'));
    expect(execute).not.toHaveBeenCalled();
  });

  it.each(['created', 'updated'] as const)('dispatches the players of faction.%s', async kind => {
    const { execute, consumer: c } = consumer();
    const handle = kind === 'created' ? c.handleFactionCreated.bind(c) : c.handleFactionUpdated.bind(c);
    await handle(
      { data: { id: 'f-1', gameId: 'sg-1', players: ['p', 'p', '', 3, 'q'] } },
      kafka(`internal.rmu-strategic.faction.${kind}.v1`),
    );
    expect(execute).toHaveBeenCalledWith(new SyncFactionPlayersCommand('sg-1', 'f-1', ['p', 'q']));
  });

  it('ignores a faction event without players, game, a usable id or of the environment', async () => {
    const { execute, consumer: c } = consumer();
    await c.handleFactionUpdated({ data: { id: 'f-1', gameId: 'sg-1' } }, kafka('t'));
    await c.handleFactionUpdated({ data: { id: 'f-1', players: [] } }, kafka('t'));
    await c.handleFactionUpdated({ data: { id: 'a.b', gameId: 'sg-1', players: [] } }, kafka('t'));
    await c.handleFactionUpdated({ data: { id: '$x', gameId: 'sg-1', players: [] } }, kafka('t'));
    await c.handleFactionUpdated({ data: { id: 'environment', gameId: 'sg-1', players: [] } }, kafka('t'));
    expect(execute).not.toHaveBeenCalled();
    await c.handleFactionUpdated({ data: { id: 'f-1', gameId: 'sg-1', players: [] } }, kafka('t'));
    expect(execute).toHaveBeenCalledWith(new SyncFactionPlayersCommand('sg-1', 'f-1', []));
  });
});

describe('sync handlers', () => {
  const repository = () => ({
    updateStrategicMembers: vi.fn(() => Promise.resolve(2)),
    updateFactionPlayers: vi.fn(() => Promise.resolve(3)),
  });

  it('writes the members on the tactical games of the strategic game', async () => {
    const repo = repository();
    const members = [{ userId: 'm', role: 'master' as const }];
    const changed = await new SyncStrategicMembersHandler(repo as unknown as GameRepository).execute(
      new SyncStrategicMembersCommand('sg-1', 'o', members),
    );
    expect(changed).toBe(2);
    expect(repo.updateStrategicMembers).toHaveBeenCalledWith('sg-1', 'o', members);
  });

  it('writes the players of the faction on the tactical games of its strategic game', async () => {
    const repo = repository();
    const changed = await new SyncFactionPlayersHandler(repo as unknown as GameRepository).execute(
      new SyncFactionPlayersCommand('sg-1', 'f-1', ['p']),
    );
    expect(changed).toBe(3);
    expect(repo.updateFactionPlayers).toHaveBeenCalledWith('sg-1', 'f-1', ['p']);
  });
});

describe('faction players of a new game', () => {
  it('reads the players of the factions strategic knows, without those of older versions', async () => {
    const factions: StrategicFaction[] = [
      { id: 'f-1', gameId: 'sg-1', name: 'A', owner: 'o', players: ['p', 'p'] },
      { id: 'f-2', gameId: 'sg-1', name: 'B', owner: 'o' },
    ];
    const port = { findById: vi.fn((id: string) => Promise.resolve(factions.find(each => each.id === id) ?? null)) };
    expect(await factionPlayersOf(port, ['f-1', 'f-2', 'f-3', 'f-1'])).toEqual({ 'f-1': ['p'] });
    expect(port.findById).toHaveBeenCalledTimes(3);
  });

  it('keeps the members and the players in the props of the game', () => {
    const game = Game.create(
      'sg-1',
      'Moria',
      ['f-1'],
      [],
      undefined,
      undefined,
      undefined,
      'gm',
      'gm',
      'private',
      null,
      [{ userId: 'p', role: 'player' }],
      { 'f-1': ['p'] },
    );
    game.setFactionPlayers({ 'f-2': ['q'] });
    const props = game.getProps();
    expect(props.strategicMembers).toEqual([{ userId: 'p', role: 'player' }]);
    expect(props.factionPlayers).toEqual({ 'f-1': ['p'], 'f-2': ['q'] });
    expect(Game.fromProps(props).isFactionPlayer('f-2', 'q')).toBe(true);
    expect(Game.fromProps(props).strategicRoleOf('p')).toBe('player');
  });

  it('reads the members of a strategic game', () => {
    expect(StrategicMembers.fromEvent(undefined)).toEqual([]);
    expect(StrategicMembers.fromEvent([{ userId: 'm', role: 'master', userName: 'M' }])).toEqual([{ userId: 'm', role: 'master' }]);
  });
});
