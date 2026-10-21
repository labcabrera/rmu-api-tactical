import { ActorRound } from '../../../src/modules/actor-rounds/domain/aggregates/actor-round.aggregate';
import { effect, load, stunPenalty, stuns } from './actor-round-test.factory';

const statuses = (round: ActorRound) => round.effects.map(e => e.status);

/** Closes the round and opens the next one, as StartRoundHandler does. */
const nextRound = (round: ActorRound) => {
  round.applyUpkeep();
  return ActorRound.createFromPrevious(round);
};

describe('ActorRound hits and death (§9.8 Hits)', () => {
  it('leaves an unconscious actor unconscious in the upkeep', () => {
    const round = load({ hp: [50, 10] });
    round.applyAttackResults(20, [], undefined);
    expect(statuses(round)).toEqual(['unconscious']);

    round.applyUpkeep();

    expect(round.isDead()).toBe(false);
    expect(statuses(round)).toEqual(['unconscious']);
  });

  it('kills a dying actor when its rounds run out, and drops the dying effect', () => {
    const round = load({ hp: [50, -5], effects: [effect('unconscious'), effect('dying', undefined, 1)] });

    round.applyUpkeep();

    expect(round.isDead()).toBe(true);
    expect(statuses(round)).toEqual(['unconscious', 'dead']);
  });

  it('keeps a dying actor alive while it has rounds left', () => {
    const round = load({ hp: [50, -5], effects: [effect('dying', undefined, 2)] });

    round.applyUpkeep();

    expect(round.isDead()).toBe(false);
    expect(round.effects[0].rounds).toBe(1);
  });

  it('dies when the hits below zero exceed the Body Development bonus', () => {
    const survives = load({ hp: [80, 10, 50] });
    const dies = load({ hp: [80, 10, 50] });

    survives.applyAttackResults(60, [], undefined);
    dies.applyAttackResults(61, [], undefined);

    expect(survives.hp.current).toBe(-50);
    expect(survives.isDead()).toBe(false);
    expect(dies.isDead()).toBe(true);
  });

  it('falls back to the maximum hits when the actor round has no death threshold', () => {
    const survives = load({ hp: [40, 10] });
    const dies = load({ hp: [40, 10] });

    survives.applyAttackResults(50, [], undefined);
    dies.applyAttackResults(51, [], undefined);

    expect(survives.isDead()).toBe(false);
    expect(dies.isDead()).toBe(true);
  });

  it('dies in the upkeep when bleeding takes it beyond the threshold', () => {
    const round = load({ hp: [80, -18, 20], effects: [effect('unconscious'), effect('bleeding', 3)] });

    round.applyUpkeep();

    expect(round.hp.current).toBe(-21);
    expect(round.isDead()).toBe(true);
  });
});

describe('ActorRound stun (§9.8 Stun, §8.3 Upkeep)', () => {
  it('stores the rounds of the table, without an extra one', () => {
    const round = load({});

    round.applyAttackResults(0, [effect('stunned', -25, 2)], undefined);

    expect(stuns(round)).toEqual([{ value: -25, rounds: 2 }]);
  });

  it('adds up the rounds of stuns with the same value', () => {
    const round = load({});

    round.applyAttackResults(0, [effect('stunned', -25, 1), effect('stunned', -50, 2)], undefined);
    round.applyAttackResults(0, [effect('stunned', -25, 2)], undefined);

    expect(stuns(round)).toEqual([
      { value: -25, rounds: 3 },
      { value: -50, rounds: 2 },
    ]);
  });

  it('follows the example of Taor: -75 for 1 round, then -50 for 2 and -25 for 2', () => {
    let round = load({});
    // Taor had 2 rounds of Stun[-50] and 1 of Stun[-25], then a hit from behind gives 1 of Stun[-75] and 1 of Stun[-25].
    round.applyAttackResults(0, [effect('stunned', -50, 2), effect('stunned', -25, 1)], undefined, { phase: 1, spentAp: 0 });
    round.applyAttackResults(0, [effect('stunned', -75, 1), effect('stunned', -25, 1)], undefined, { phase: 2, spentAp: 1 });

    const penalties = [stunPenalty(round)];
    for (let i = 0; i < 5; i++) {
      round = nextRound(round);
      penalties.push(stunPenalty(round));
    }

    expect(penalties).toEqual([-75, -50, -50, -25, -25, 0]);
    expect(stuns(round)).toEqual([]);
  });

  it('takes the stun penalty into the initiative of the next round', () => {
    const round = load({ initiativeBase: 5 });
    round.applyAttackResults(0, [effect('stunned', -50, 2)], undefined);

    const next = nextRound(round);
    next.declareInitiative(10);

    expect(next.initiative.penalty).toBe(-5);
    expect(next.initiative.total).toBe(10);
  });
});

describe('ActorRound effect duration (§8.3 Upkeep)', () => {
  it('stamps the effects with the round, the phase and the AP spent before them', () => {
    const round = load({ round: 3 });

    round.applyAttackResults(0, [effect('stunned', -25, 1)], undefined, { phase: 2, spentAp: 1 });

    expect(round.effects[0]).toMatchObject({ appliedRound: 3, appliedPhase: 2, spentApBefore: 1 });
  });

  it('shortens in the same round an effect applied with fewer than 2 AP spent', () => {
    const round = load({});
    round.applyAttackResults(0, [effect('stunned', -25, 1), effect('must_parry', undefined, 1)], undefined, { phase: 2, spentAp: 1 });

    round.applyUpkeep();

    expect(round.effects).toEqual([]);
  });

  it('keeps until the next upkeep the rounds of an effect applied with 2 AP or more spent (Caitsley)', () => {
    let round = load({});
    // Caitsley had spent 3 AP when she was stunned: she is still stunned after the upkeep of that round.
    round.applyAttackResults(0, [effect('stunned', -25, 1), effect('must_parry', undefined, 1)], undefined, { phase: 4, spentAp: 3 });

    round = nextRound(round);
    expect(stuns(round)).toEqual([{ value: -25, rounds: 1 }]);
    expect(statuses(round)).toContain('must_parry');

    round = nextRound(round);
    expect(round.effects).toEqual([]);
  });

  it('shortens the effects stored without a stamp in every upkeep', () => {
    const round = load({ effects: [effect('stunned', -25, 1), effect('must_parry', undefined, 1)] });

    round.applyUpkeep();

    expect(round.effects).toEqual([]);
  });

  it('only shortens the worst stun', () => {
    let round = load({});
    round.applyAttackResults(0, [effect('stunned', -25, 1)], undefined, { phase: 4, spentAp: 3 });
    round = nextRound(round);
    round.applyAttackResults(0, [effect('stunned', -50, 1)], undefined, { phase: 4, spentAp: 3 });

    round = nextRound(round);

    expect(stuns(round)).toEqual([
      { value: -25, rounds: 1 },
      { value: -50, rounds: 1 },
    ]);
    expect(stunPenalty(round)).toBe(-50);
  });
});
