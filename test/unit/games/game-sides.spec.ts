import { describe, expect, it } from 'vitest';
import { GroupCheckService } from '../../../src/modules/psychology/application/services/group-check.service.js';
import { Game } from '../../../src/modules/games/domain/aggregates/game.js';
import { Actor } from '../../../src/modules/games/domain/value-objects/actor.vo.js';
import type { GameSide } from '../../../src/modules/games/domain/value-objects/game-side.vo.js';
import { load } from '../actor-rounds/actor-round-test.factory.js';

const actor = (id: string, factionId: string) =>
  Actor.fromProps({ id, name: id, faction: { id: factionId, name: factionId }, type: 'character', owner: 'gm' });

/** A game as the repository loads it (workspace spec 100). */
const loaded = (overrides: Partial<Parameters<typeof Game.fromProps>[0]> = {}) =>
  Game.fromProps({
    id: 'game-1',
    strategicGameId: 'sg-1',
    name: 'Amon Hen',
    status: 'created',
    round: 0,
    phase: 'not_started',
    factions: ['f1', 'f2', 'f3'],
    actors: [actor('aragorn', 'f1'), actor('boromir', 'f2'), actor('lurtz', 'f3')],
    owner: 'gm',
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }).restoreVersion(1);

const side = (id: string, factionIds: string[], leaderActorId: string | null = null, name: string | null = null): GameSide => ({
  id,
  name,
  factionIds,
  leaderActorId,
});

const fellowship = () => [side('fellowship', ['f1', 'f2'], 'aragorn', 'Fellowship'), side('uruks', ['f3'])];

describe('effective sides (workspace spec 100, decision 1)', () => {
  it('without sides, each faction is a side of its own named by the front', () => {
    const game = loaded();
    expect(game.sidesDefined()).toBe(false);
    expect(game.effectiveSides()).toEqual([side('f1', ['f1']), side('f2', ['f2']), side('f3', ['f3'])]);
    expect(game.sideOf('f2')).toBe('f2');
    expect(game.sideFactionIds('f2')).toEqual(['f2']);
    expect(game.allyFactionIds('f1')).toEqual(['f1']);
    expect(game.psychologyRulesOrDefault()).toBe('book');
  });

  it('with sides, resolves the side of a faction and its allies', () => {
    const game = loaded({ sides: fellowship() });
    expect(game.sidesDefined()).toBe(true);
    expect(game.sideOf('f2')).toBe('fellowship');
    expect(game.sideFactionIds('fellowship')).toEqual(['f1', 'f2']);
    expect(game.allyFactionIds('f2')).toEqual(['f1', 'f2']);
    expect(game.sideOf('unknown')).toBeUndefined();
    expect(game.allyFactionIds('unknown')).toEqual(['unknown']);
  });

  it('new games take the house rules unless told otherwise', () => {
    expect(Game.create('sg-1', 'New', [], [], undefined, undefined, undefined, 'gm').psychologyRulesOrDefault()).toBe('house');
    const book = Game.create('sg-1', 'New', [], [], undefined, undefined, undefined, 'gm', undefined, undefined, null, [], {}, 'book');
    expect(book.psychologyRules).toBe('book');
  });
});

describe('setting the sides (workspace spec 100, decisions 4 and 5)', () => {
  it('stores a valid partition with its leader, trimming names', () => {
    const game = loaded();
    game.setSides([side('fellowship', ['f1', 'f2'], 'boromir', '  Fellowship '), side('uruks', ['f3'])]);
    expect(game.sides).toEqual([side('fellowship', ['f1', 'f2'], 'boromir', 'Fellowship'), side('uruks', ['f3'])]);
    expect(game.getUncommittedEvents()).toHaveLength(1);
  });

  it('an empty list goes back to one side per faction', () => {
    const game = loaded({ sides: fellowship() });
    game.setSides([]);
    expect(game.sidesDefined()).toBe(false);
  });

  it.each([
    ['a faction without a side', [side('fellowship', ['f1', 'f2'])]],
    ['a faction in two sides', [side('a', ['f1', 'f2']), side('b', ['f2', 'f3'])]],
    ['a faction not in the game', [side('a', ['f1', 'f2', 'f3', 'f9'])]],
    ['an empty side', [side('a', ['f1', 'f2', 'f3']), side('b', [])]],
    ['a duplicated id', [side('a', ['f1', 'f2']), side('a', ['f3'])]],
    ['an invalid id', [side('a b', ['f1', 'f2', 'f3'])]],
    ['a too long id', [side('x'.repeat(65), ['f1', 'f2', 'f3'])]],
    ['a too long name', [side('a', ['f1', 'f2', 'f3'], null, 'n'.repeat(61))]],
  ])('rejects %s with err-sides-invalid', (_, sides) => {
    expect(() => loaded().setSides(sides)).toThrow(expect.objectContaining({ statusCode: 400, code: 'err-sides-invalid' }));
  });

  it('rejects a leader that is not an actor of its side', () => {
    const wrongSide = [side('fellowship', ['f1', 'f2'], 'lurtz'), side('uruks', ['f3'])];
    expect(() => loaded().setSides(wrongSide)).toThrow(expect.objectContaining({ code: 'err-side-leader-invalid' }));
    const unknown = [side('fellowship', ['f1', 'f2'], 'gandalf'), side('uruks', ['f3'])];
    expect(() => loaded().setSides(unknown)).toThrow(expect.objectContaining({ code: 'err-side-leader-invalid' }));
  });

  it('locks the sides once the game started', () => {
    const game = loaded({ status: 'in_progress', round: 1, phase: 'phase_1' });
    expect(() => game.setSides(fellowship())).toThrow(expect.objectContaining({ statusCode: 409, code: 'err-sides-locked' }));
  });

  it('changes the psychology rules only while the game is created', () => {
    const game = loaded();
    game.update(undefined, undefined, undefined, undefined, undefined, 'house');
    expect(game.psychologyRulesOrDefault()).toBe('house');
    const started = loaded({ status: 'in_progress', round: 1, phase: 'phase_1' });
    // The same rules are no change
    started.update(undefined, undefined, undefined, undefined, undefined, 'book');
    expect(() => started.update(undefined, undefined, undefined, undefined, undefined, 'house')).toThrow(
      expect.objectContaining({ statusCode: 409, code: 'err-game-not-created' }),
    );
  });
});

describe('factions coming and going (workspace spec 100, decisions 2 and 3)', () => {
  it('a new faction gets a side of its own, with a free id', () => {
    const game = loaded({ sides: [side('fellowship', ['f1', 'f2']), side('f4', ['f3'])] });
    game.addFactions(['f4', 'f5']);
    expect(game.sides.map(each => [each.id, each.factionIds])).toEqual([
      ['fellowship', ['f1', 'f2']],
      ['f4', ['f3']],
      ['f4-2', ['f4']],
      ['f5', ['f5']],
    ]);
  });

  it('without sides defined nothing is stored', () => {
    const game = loaded();
    game.addFactions(['f4']);
    expect(game.sides).toEqual([]);
    expect(game.effectiveSides().map(each => each.id)).toEqual(['f1', 'f2', 'f3', 'f4']);
  });

  it('a faction deleted leaves its side, an empty side goes and a leader of another faction stays', () => {
    const game = loaded({ sides: fellowship() });
    game.deleteFactions(['f3']);
    expect(game.sides).toEqual([side('fellowship', ['f1', 'f2'], 'aragorn', 'Fellowship')]);
    game.deleteFactions(['f1']);
    // The leader was of f1: the side has no leader now
    expect(game.sides).toEqual([side('fellowship', ['f2'], null, 'Fellowship')]);
  });

  it('a leader deleted as an actor leaves its side without a leader', () => {
    const game = loaded({ sides: fellowship() });
    game.deleteActors(['aragorn']);
    expect(game.sides[0].leaderActorId).toBeNull();
  });

  it('the environment joins alone when its NPCs come, even in a started game, and leaves when they go', () => {
    const game = loaded({ sides: fellowship(), status: 'in_progress', round: 1, phase: 'phase_1' });
    game.addActors([actor('wolf', 'environment')], [{ npcId: 'wolf', count: 1, name: 'Wolf' }]);
    expect(game.sides.map(each => each.id)).toEqual(['fellowship', 'uruks', 'environment']);
    const created = loaded({ sides: fellowship(), factions: ['f1', 'f2', 'f3', 'environment'] });
    created.setSides([side('fellowship', ['f1', 'f2']), side('uruks', ['f3', 'environment'])]);
    created.actors.push(actor('wolf', 'environment'));
    created.deleteActors(['wolf']);
    expect(created.factions).not.toContain('environment');
    expect(created.sides).toEqual([side('fellowship', ['f1', 'f2']), side('uruks', ['f3'])]);
  });
});

describe('default group of the checks (workspace spec 100, decision 7)', () => {
  it('takes every faction of the side of the leader', () => {
    const game = loaded({ sides: fellowship() });
    const round = (actorId: string, factionId: string) => Object.assign(load({ factionId }), { actorId });
    const rounds = [round('aragorn', 'f1'), round('boromir', 'f2'), round('lurtz', 'f3')];
    const group = GroupCheckService.group(rounds, undefined, 'aragorn', factionId => game.allyFactionIds(factionId));
    expect(group.map(each => each.actorId)).toEqual(['aragorn', 'boromir']);
    // Without sides, the faction of the leader alone
    expect(GroupCheckService.group(rounds, undefined, 'aragorn').map(each => each.actorId)).toEqual(['aragorn']);
  });
});
