import { describe, expect, it } from 'vitest';
import { ALL_STUN_ROUNDS } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.js';
import { rollHerbHeal } from '../../../src/modules/actor-rounds/application/cqrs/handlers/use-herb.handler.js';
import { effect, load, stunPenalty, stuns } from './actor-round-test.factory.js';

describe('ActorRound herbs (workspace spec 062)', () => {
  it('heals the hits of a herb up to the maximum, logged as a treatment', () => {
    const round = load({ hp: [50, 40] });
    expect(round.useHerb({ hits: 6, stunRounds: 0 }, 2)).toEqual({ healed: 6, stunRoundsRemoved: 0 });
    expect(round.hp.current).toBe(46);
    expect(round.useHerb({ hits: 10, stunRounds: 0 })).toEqual({ healed: 4, stunRoundsRemoved: 0 });
    expect(round.hpLog.map(entry => [entry.kind, entry.amount, entry.phase])).toEqual([
      ['treatment', 6, 2],
      ['treatment', 4, undefined],
    ]);
  });

  it('removes stun rounds from the most severe stun on, and every stun with 999', () => {
    const round = load({ effects: [effect('stunned', -25, 2), effect('stunned', -50, 2)] });
    round.useHerb({ hits: 0, stunRounds: 0 });
    expect(stunPenalty(round)).toBe(-50);
    expect(round.useHerb({ hits: 0, stunRounds: 3 })).toEqual({ healed: 0, stunRoundsRemoved: 3 });
    expect(stuns(round)).toEqual([{ value: -25, rounds: 1 }]);
    expect(stunPenalty(round)).toBe(-25);
    expect(round.useHerb({ hits: 0, stunRounds: 5 })).toEqual({ healed: 0, stunRoundsRemoved: 1 });
    expect(stuns(round)).toEqual([]);
    expect(stunPenalty(round)).toBe(0);

    const all = load({ effects: [effect('stunned', -25, 4), effect('stunned', -50, 3), effect('prone')] });
    expect(all.useHerb({ hits: 0, stunRounds: ALL_STUN_ROUNDS })).toEqual({ healed: 0, stunRoundsRemoved: 7 });
    expect(stuns(all)).toEqual([]);
    expect(all.effects.map(each => each.status)).toEqual(['prone']);
  });

  it('rolls the hits of a dose in the range of the herb', () => {
    expect(rollHerbHeal({ min: 2, max: 8 }, () => 0)).toBe(2);
    expect(rollHerbHeal({ min: 2, max: 8 }, () => 0.999)).toBe(8);
  });
});
