import { describe, expect, it } from 'vitest';
import { Game } from '../../../src/modules/games/domain/aggregates/game.js';
import { Actor } from '../../../src/modules/games/domain/value-objects/actor.vo.js';
import type { StrategicMember } from '../../../src/modules/games/domain/value-objects/strategic-member.vo.js';
import { GameGuardAdapter } from '../../../src/modules/games/infrastructure/security/game-guard.adapter.js';
import { ForbiddenError } from '../../../src/modules/shared/domain/errors/errors.js';

const ADMIN = ['rmu-admin'];
const USER = ['rmu-user'];
const guard = new GameGuardAdapter();

type GameOverrides = {
  accessType?: string;
  strategicGameOwner?: string;
  strategicMembers?: StrategicMember[];
  factionPlayers?: Record<string, string[]>;
  factions?: string[];
  actors?: Actor[];
};

const game = (props: GameOverrides = {}) =>
  Game.fromProps({
    id: 'game-1',
    strategicGameId: 'sg-1',
    name: 'Moria',
    status: 'created',
    round: 0,
    phase: 'not_started',
    factions: ['f1'],
    actors: [
      Actor.fromProps({ id: 'faramir', name: 'Faramir', faction: { id: 'f1', name: 'Gondor' }, type: 'character', owner: 'player' }),
    ],
    owner: 'gm',
    createdAt: new Date(),
    ...props,
  });

// Spec 021, decision 2 [F-tactical-11].
describe('GameGuardAdapter', () => {
  it('lets the owner, the strategic owner and an admin manage the game', () => {
    const g = game({ strategicGameOwner: 'sgm' });
    for (const [user, roles] of [
      ['gm', USER],
      ['sgm', USER],
      ['anyone', ADMIN],
    ] as const) {
      expect(() => guard.checkUpdate(g, user, [...roles])).not.toThrow();
      expect(() => guard.checkDelete(g, user, [...roles])).not.toThrow();
      expect(() => guard.checkAct(g, 'orc', user, [...roles])).not.toThrow();
    }
    expect(() => guard.checkUpdate(g, 'player', USER)).toThrow(ForbiddenError);
    expect(() => guard.checkDelete(g, 'player', USER)).toThrow(ForbiddenError);
  });

  it('does not take a missing strategic owner for anybody', () => {
    expect(() => guard.checkUpdate(game(), '', [])).toThrow(ForbiddenError);
  });

  it('lets the owner of an actor act for it, and take part in the game', () => {
    const g = game();
    expect(() => guard.checkAct(g, 'faramir', 'player', [])).not.toThrow();
    expect(() => guard.checkAct(g, 'orc', 'player', [])).toThrow(ForbiddenError);
    expect(() => guard.checkParticipate(g, 'player', [])).not.toThrow();
    expect(() => guard.checkParticipate(g, 'stranger', USER)).toThrow(ForbiddenError);
  });

  it('reads a private game only for its managers and actor owners, and a public one for everybody', () => {
    expect(() => guard.checkRead(game(), 'player', [])).not.toThrow();
    expect(() => guard.checkRead(game(), 'gm', [])).not.toThrow();
    expect(() => guard.checkRead(game(), 'stranger', USER)).toThrow(ForbiddenError);
    expect(() => guard.checkRead(game({ accessType: 'public' }), 'stranger', [])).not.toThrow();
  });

  it('creates with rmu-user or rmu-admin', () => {
    expect(() => guard.checkCreate(USER)).not.toThrow();
    expect(() => guard.checkCreate(ADMIN)).not.toThrow();
    expect(() => guard.checkCreate([])).toThrow(ForbiddenError);
  });

  it('lists everything for an admin, and the readable games for the rest', () => {
    expect(guard.buildQueryPredicate('u', ADMIN)).toEqual({});
    expect(guard.buildQueryPredicate('u', USER)).toEqual({
      $or: [
        { accessType: 'public' },
        { owner: 'u' },
        { strategicGameOwner: 'u' },
        { 'actors.owner': 'u' },
        { 'strategicMembers.userId': 'u' },
      ],
    });
  });
});

// Workspace spec 072, decisions 11 and 12.
describe('GameGuardAdapter with the members of the strategic game', () => {
  const orc = Actor.fromProps({ id: 'orc', name: 'Orc', faction: { id: 'f2', name: 'Mordor' }, type: 'npc', owner: 'gm' });
  const faramir = Actor.fromProps({
    id: 'faramir',
    name: 'Faramir',
    faction: { id: 'f1', name: 'Gondor' },
    type: 'character',
    owner: 'player',
  });
  const boromir = Actor.fromProps({
    id: 'boromir',
    name: 'Boromir',
    faction: { id: 'f1', name: 'Gondor' },
    type: 'character',
    owner: 'gone',
  });
  const shared = () =>
    game({
      factions: ['f1', 'f2'],
      actors: [faramir, boromir, orc],
      strategicMembers: [
        { userId: 'master', role: 'master' },
        { userId: 'p1', role: 'player' },
        { userId: 'p2', role: 'player' },
        { userId: 'watcher', role: 'spectator' },
      ],
      factionPlayers: { f1: ['p1'], f3: ['p2'] },
    });

  it('lets every member read the game, spectators too', () => {
    for (const user of ['master', 'p1', 'p2', 'watcher']) {
      expect(() => guard.checkRead(shared(), user, USER)).not.toThrow();
    }
    expect(() => guard.checkRead(shared(), 'stranger', USER)).toThrow(ForbiddenError);
  });

  it('lets the masters manage the game, and nobody else of the members', () => {
    expect(() => guard.checkUpdate(shared(), 'master', USER)).not.toThrow();
    expect(() => guard.checkDelete(shared(), 'master', USER)).not.toThrow();
    expect(() => guard.checkAct(shared(), 'orc', 'master', USER)).not.toThrow();
    for (const user of ['p1', 'p2', 'watcher']) {
      expect(() => guard.checkUpdate(shared(), user, USER)).toThrow(ForbiddenError);
      expect(() => guard.checkDelete(shared(), user, USER)).toThrow(ForbiddenError);
    }
  });

  it('lets a faction player act for every actor of the faction, and the actor owner for his own', () => {
    expect(() => guard.checkAct(shared(), 'faramir', 'p1', USER)).not.toThrow();
    expect(() => guard.checkAct(shared(), 'boromir', 'p1', USER)).not.toThrow();
    expect(() => guard.checkAct(shared(), 'orc', 'p1', USER)).toThrow(ForbiddenError);
    expect(() => guard.checkAct(shared(), 'faramir', 'player', USER)).not.toThrow();
    expect(() => guard.checkAct(shared(), 'faramir', 'p2', USER)).toThrow(ForbiddenError);
    expect(() => guard.checkAct(shared(), 'faramir', 'watcher', USER)).toThrow(ForbiddenError);
    expect(() => guard.checkAct(shared(), 'unknown', 'p1', USER)).toThrow(ForbiddenError);
  });

  it('lets the players of a faction of the game take part, not those of a faction outside it', () => {
    expect(() => guard.checkParticipate(shared(), 'p1', USER)).not.toThrow();
    expect(() => guard.checkParticipate(shared(), 'p2', USER)).toThrow(ForbiddenError);
    expect(() => guard.checkParticipate(shared(), 'watcher', USER)).toThrow(ForbiddenError);
  });

  it('answers the access of each user', () => {
    expect(guard.accessOf(shared(), 'gm', USER)).toBe('manage');
    expect(guard.accessOf(shared(), 'master', USER)).toBe('manage');
    expect(guard.accessOf(shared(), 'anyone', ADMIN)).toBe('manage');
    expect(guard.accessOf(shared(), 'p1', USER)).toBe('act');
    expect(guard.accessOf(shared(), 'player', USER)).toBe('act');
    expect(guard.accessOf(shared(), 'p2', USER)).toBe('read');
    expect(guard.accessOf(shared(), 'watcher', USER)).toBe('read');
  });

  it('keeps the rules of spec 021 in a game without members or faction players', () => {
    const old = game();
    expect(old.strategicMembers).toEqual([]);
    expect(old.factionPlayers).toEqual({});
    expect(() => guard.checkRead(old, 'master', USER)).toThrow(ForbiddenError);
    expect(() => guard.checkUpdate(old, 'master', USER)).toThrow(ForbiddenError);
    expect(guard.accessOf(old, 'player', USER)).toBe('act');
    expect(guard.accessOf(old, 'gm', USER)).toBe('manage');
  });

  it('does not take an empty user for a member', () => {
    const g = game({ strategicMembers: [{ userId: '', role: 'master' }], factionPlayers: { f1: [''] } });
    expect(() => guard.checkUpdate(g, '', [])).toThrow(ForbiddenError);
    expect(() => guard.checkParticipate(g, '', [])).toThrow(ForbiddenError);
  });
});
