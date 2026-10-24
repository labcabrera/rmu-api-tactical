import { describe, expect, it, vi } from 'vitest';
import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round';
import { buildInjury, Injury } from '../../../src/modules/actor-rounds/domain/value-objects/injury.vo';
import { ApplyGameCommand } from '../../../src/modules/games/application/cqrs/commands/apply-game.command';
import { ApplyGameHandler } from '../../../src/modules/games/application/cqrs/handlers/apply-game.handler';
import type { GameRepository } from '../../../src/modules/games/application/ports/game-repository.port';
import { Game } from '../../../src/modules/games/domain/aggregates/game';
import { TacticalGameOutcomeCalculator } from '../../../src/modules/games/domain/services/tactical-game-outcome.calculator';
import { Actor } from '../../../src/modules/games/domain/value-objects/actor.vo';
import { effect, load } from '../actor-rounds/actor-round-test.factory';

const faction = { id: 'f1', name: 'Fellowship' };
const actor = (id: string, type: 'character' | 'npc' = 'character') => Actor.fromProps({ id, name: id, faction, type, owner: 'gm' });

const game = (status: 'in_progress' | 'finished' = 'in_progress') =>
  Game.fromProps({
    id: 'game-1',
    strategicGameId: 'sg-1',
    name: 'Moria',
    status,
    round: 2,
    phase: 'phase_2',
    factions: ['f1'],
    actors: [actor('aragorn'), actor('boromir'), actor('orc', 'npc')],
    owner: 'gm',
    createdAt: new Date(),
  });

const old = (id: string, penalty: number): Injury => ({
  ...buildInjury({ id, type: 'bone', penalty, source: { kind: 'manual' }, createdAt: new Date('2026-01-01') }),
});

/** Round 1 built from the character (with its snapshot) and round 2. */
const rounds = (
  actorId: string,
  start: number,
  end: number,
  injuries: Injury[],
  broughtIds: string[],
  effects = [] as ReturnType<typeof effect>[],
) => {
  const first = Object.assign(load({ round: 1, hp: [50, start] }), { actorId });
  first.characterId = `char-${actorId}`;
  first.snapshot = { hp: start, injuryIds: broughtIds, conditionIds: [] };
  const last = Object.assign(load({ round: 2, hp: [50, end], injuries, effects }), { actorId });
  last.characterId = `char-${actorId}`;
  return [first, last];
};

describe('TacticalGameOutcomeCalculator (spec 013, §3)', () => {
  const setup = () => {
    const brought = old('old-1', -20);
    const healed = { ...old('old-2', -10), status: 'healed' as const };
    const fresh = buildInjury({ id: 'new-1', type: 'cut-burn', penalty: -10, bleeding: 3, source: { kind: 'critical' } });
    const actorRounds: ActorRound[] = [
      ...rounds('aragorn', 40, 25, [brought, healed, fresh], ['old-1', 'old-2', 'old-3']),
      ...rounds('boromir', 50, 30, [], [], [effect('unconscious')]),
    ];
    return { actorRounds };
  };

  it('previews the characters (no NPCs) with hits as a difference, injuries by uuid and the characters at risk', () => {
    const { actorRounds } = setup();

    const preview = TacticalGameOutcomeCalculator.preview(game(), actorRounds);

    expect(preview.characters.map(c => c.actorId)).toEqual(['aragorn', 'boromir']);
    const aragorn = preview.characters[0];
    expect(aragorn.characterId).toBe('char-aragorn');
    expect(aragorn.hp).toEqual({ start: 40, end: 25, delta: -15 });
    expect(aragorn.injuriesAdded).toEqual(['new-1']);
    expect(aragorn.injuriesHealed).toEqual(['old-2', 'old-3']);
    expect(aragorn.injuries.map(i => i.id)).toEqual(['old-1', 'old-2', 'new-1']);
    expect(preview.characters[1].conditions).toEqual([expect.objectContaining({ status: 'unconscious' })]);
    expect(preview.atRisk).toEqual([{ actorId: 'aragorn', characterId: 'char-aragorn', name: '', bleeding: 3, dyingRounds: undefined }]);
  });

  it('gathers the hits log of every round of a character, with its totals by kind and by attacker (spec 013, §1.1)', () => {
    const { actorRounds } = setup();
    const [first, last] = actorRounds;
    first.applyAttackResults(
      10,
      [],
      undefined,
      { phase: 1, spentAp: 1 },
      [],
      [
        { kind: 'attack', amount: -6, attackerId: 'orc', attackerName: 'Orc' },
        { kind: 'critical', amount: -4, attackerId: 'orc', attackerName: 'Orc', criticalKey: 'S-A-10' },
      ],
    );
    last.adjustHp(-5);

    const aragorn = TacticalGameOutcomeCalculator.preview(game(), actorRounds).characters[0];

    expect(aragorn.hpLog!.map(e => [e.round, e.kind, e.amount])).toEqual([
      [1, 'attack', -6],
      [1, 'critical', -4],
      [2, 'manual', 5],
    ]);
    expect(aragorn.hpBySource).toEqual({
      byKind: { attack: -6, critical: -4, manual: 5 },
      byAttacker: [{ attackerId: 'orc', attackerName: 'Orc', amount: -10 }],
    });
    expect(TacticalGameOutcomeCalculator.preview(game(), actorRounds).characters[1].hpLog).toEqual([]);
  });

  it('sends the lasting breakage the items got in the game (spec 019)', () => {
    const { actorRounds } = setup();
    const last = actorRounds[1];
    last.items = [
      {
        itemId: 'sword',
        name: 'Sword',
        kind: 'weapon',
        slot: 'mainHand',
        strength: 80,
        modifiers: [
          { id: 'old', type: 'breakage', value: -10, appliesTo: 'all', createdAt: '' },
          { id: 'new', type: 'breakage', value: -20, appliesTo: 'all', createdAt: '' },
          { id: 'tmp', type: 'breakage', value: -20, appliesTo: 'all', temporary: true, createdAt: '' },
        ],
        startModifierIds: ['old'],
      },
      { itemId: 'rope', name: 'Rope', kind: 'other', strength: 10, modifiers: [], startModifierIds: [] },
    ];
    const aragorn = TacticalGameOutcomeCalculator.preview(game(), actorRounds).characters[0];
    expect(aragorn.items).toEqual([{ itemId: 'sword', name: 'Sword', modifiers: [expect.objectContaining({ id: 'new', value: -20 })] }]);
  });

  it('requires a fate for every character at risk, listing them', () => {
    const { actorRounds } = setup();

    expect(() => TacticalGameOutcomeCalculator.finish(game(), actorRounds, [])).toThrow(
      expect.objectContaining({
        errorCode: 'err-finish-fate-required',
        details: { atRisk: [expect.objectContaining({ actorId: 'aragorn' })] },
      }),
    );
  });

  it('finishes with the fates of the characters at risk as conditions', () => {
    const { actorRounds } = setup();
    const finishing = game();

    finishing.finish(
      TacticalGameOutcomeCalculator.finish(finishing, actorRounds, [
        { actorId: 'aragorn', fate: 'permanent-unconscious' },
        { actorId: 'boromir', fate: 'dead' },
      ]),
    );

    expect(finishing.status).toBe('finished');
    const [aragorn, boromir] = finishing.outcome!.characters;
    expect(aragorn.fate).toBe('permanent-unconscious');
    expect(aragorn.conditions).toEqual([expect.objectContaining({ status: 'permanent-unconscious' })]);
    // Not at risk: its fate is ignored.
    expect(boromir.fate).toBeUndefined();
    expect(boromir.conditions.map(c => c.status)).toEqual(['unconscious']);
    expect(finishing.getUncommittedEvents().map(e => e.eventType)).toEqual(['finished']);
  });

  it('marks a dead character dead whatever its fate', () => {
    const actorRounds = rounds('aragorn', 40, -60, [], [], [effect('dead')]);
    const outcome = TacticalGameOutcomeCalculator.finish(game(), actorRounds, []);
    expect(outcome.characters[0].conditions.map(c => c.status)).toEqual(['dead']);
  });

  it('rejects actions on a finished game, and finishing it again', () => {
    const finished = game('finished');
    expect(() => finished.checkValidActionManagement()).toThrow(expect.objectContaining({ errorCode: 'err-game-finished' }));
    expect(() => finished.startRound()).toThrow(expect.objectContaining({ errorCode: 'err-game-finished' }));
    expect(() => finished.startPhase()).toThrow(expect.objectContaining({ errorCode: 'err-game-finished' }));
    expect(() => finished.finish({ finishedAt: '', characters: [] })).toThrow(expect.objectContaining({ errorCode: 'err-game-finished' }));
  });
});

describe('ApplyGameHandler (spec 013, §3)', () => {
  const finishedGame = () => {
    const finished = game();
    finished.finish(
      TacticalGameOutcomeCalculator.finish(finished, [...rounds('aragorn', 40, 30, [], []), ...rounds('boromir', 50, 45, [], [])], []),
    );
    finished.uncommit();
    return finished;
  };

  const setup = (finished: Game, failing: string[] = []) => {
    const gameRepository = {
      findById: vi.fn(() => Promise.resolve(finished)),
      update: vi.fn((_id: string, updated: Game) => Promise.resolve(updated)),
    } as unknown as GameRepository;
    const apply = vi.fn((characterId: string) => (failing.includes(characterId) ? Promise.reject(new Error('boom')) : Promise.resolve()));
    const publish = vi.fn();
    const handler = new ApplyGameHandler(gameRepository, { apply }, { publish });
    return { handler, apply, publish };
  };

  it('applies every character, keeps the errors and retries only the pending ones', async () => {
    const finished = finishedGame();
    const first = setup(finished, ['char-boromir']);

    await first.handler.execute(new ApplyGameCommand('game-1', 'gm', []));

    expect(first.apply).toHaveBeenCalledTimes(2);
    expect(first.apply).toHaveBeenCalledWith(
      'char-aragorn',
      expect.objectContaining({
        tacticalGameId: 'game-1',
        tacticalGameName: 'Moria',
        actorId: 'aragorn',
        hp: { start: 40, end: 30, delta: -10 },
      }),
    );
    const [aragorn, boromir] = finished.outcome!.characters;
    expect(aragorn.appliedAt).toBeDefined();
    expect(boromir.error).toBe('boom');
    expect(finished.outcome!.appliedAt).toBeUndefined();
    expect(first.publish).not.toHaveBeenCalledWith('game', expect.anything());

    const retry = setup(finished);
    await retry.handler.execute(new ApplyGameCommand('game-1', 'gm', []));

    expect(retry.apply).toHaveBeenCalledTimes(1);
    expect(retry.apply).toHaveBeenCalledWith('char-boromir', expect.anything());
    expect(boromir.error).toBeUndefined();
    expect(finished.outcome!.appliedAt).toBeDefined();
    expect(retry.publish).toHaveBeenCalledWith('game', expect.objectContaining({ eventType: 'applied' }));

    await expect(retry.handler.execute(new ApplyGameCommand('game-1', 'gm', []))).rejects.toThrow(
      expect.objectContaining({ errorCode: 'err-outcome-already-applied' }),
    );
  });

  it('only applies a finished game', async () => {
    const { handler } = setup(game());
    await expect(handler.execute(new ApplyGameCommand('game-1', 'gm', []))).rejects.toThrow(
      expect.objectContaining({ errorCode: 'err-game-not-finished' }),
    );
  });
});
