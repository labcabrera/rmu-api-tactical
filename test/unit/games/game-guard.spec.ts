import { describe, expect, it } from 'vitest';
import { Game } from '../../../src/modules/games/domain/aggregates/game.js';
import { Actor } from '../../../src/modules/games/domain/value-objects/actor.vo.js';
import { GameGuardAdapter } from '../../../src/modules/games/infrastructure/security/game-guard.adapter.js';
import { ForbiddenError } from '../../../src/modules/shared/domain/errors/errors.js';

const ADMIN = ['rmu-admin'];
const USER = ['rmu-user'];
const guard = new GameGuardAdapter();

const game = (props: { accessType?: string; strategicGameOwner?: string } = {}) =>
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
      $or: [{ accessType: 'public' }, { owner: 'u' }, { strategicGameOwner: 'u' }, { 'actors.owner': 'u' }],
    });
  });
});
