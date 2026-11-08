import { describe, expect, it } from 'vitest';
import type { Action } from '../../../src/modules/actions/domain/aggregates/action.js';
import {
  distanceInPhase,
  movedDistance,
  normalMovementAp,
  normalMovementFatigue,
  normalMovementPace,
  overDashInPhase,
  paceFatigue,
  paceOfMovementAp,
  slowestPace,
} from '../../../src/modules/actions/domain/services/movement-rules.js';

/* Workspace spec 081 (Core Law §5.5, §8.1-8.2). Invented actors and distances. */

const movement = (freeAction: boolean, phaseStart: number, phaseEnd: number, distance: number, actionPoints = 1) =>
  ({
    actionType: 'movement',
    status: 'completed',
    freeAction,
    phaseStart,
    phaseEnd,
    actionPoints,
    movement: { calculated: { distance } },
  }) as unknown as Action;

describe('pace of a normal movement (decision 5)', () => {
  it.each([
    [1, 'walk'],
    [2, 'jog'],
    [3, 'run'],
    [4, 'sprint'],
    [5, 'sprint'],
  ])('%i AP of movement in the round is %s', (ap, pace) => {
    expect(paceOfMovementAp(ap)).toBe(pace);
  });

  it('only counts the resolved normal movements', () => {
    const open = { ...movement(false, 2, 2, 0), status: 'declared' } as unknown as Action;
    expect(normalMovementAp([movement(false, 1, 1, 20), movement(true, 1, 1, 15), open])).toBe(1);
  });
});

describe('fatigue of a normal movement (decision 6)', () => {
  it('adds what the pace of the round reaches with each AP', () => {
    expect(normalMovementFatigue(0, 1)).toBe(0);
    expect(normalMovementFatigue(1, 1)).toBeCloseTo(1.67);
    expect(normalMovementFatigue(2, 1)).toBeCloseTo(100 / 12 - 100 / 60);
    expect(normalMovementFatigue(3, 1)).toBeCloseTo(50 - 100 / 12);
  });

  it('adds up to the fatigue of the pace of the round, in one action or several', () => {
    expect(normalMovementFatigue(0, 4)).toBe(50);
    expect(
      normalMovementFatigue(0, 1) + normalMovementFatigue(1, 1) + normalMovementFatigue(2, 1) + normalMovementFatigue(3, 1),
    ).toBeCloseTo(50);
  });
});

describe('distance of the round and of a phase', () => {
  it('spreads a movement over the phases it spans', () => {
    const run = movement(true, 1, 3, 45);
    expect([1, 2, 3, 4].map(phase => distanceInPhase(run, phase))).toEqual([15, 15, 15, 0]);
  });

  it('adds up the resolved movements', () => {
    expect(movedDistance([movement(false, 1, 1, 20), movement(true, 2, 2, 15)])).toBe(35);
  });

  it('takes the slowest of the known paces', () => {
    expect(slowestPace('run', 'walk', null)).toBe('walk');
    expect(slowestPace(undefined, null)).toBeUndefined();
  });
});

describe('a normal and a free movement in one phase (decision 2)', () => {
  it('warns past 1.25 BMR', () => {
    expect(overDashInPhase(movement(false, 1, 1, 20), [movement(true, 1, 1, 10)], 20)).toBe(true);
    expect(overDashInPhase(movement(true, 1, 1, 5), [movement(false, 1, 1, 20)], 20)).toBe(false);
  });

  it('does not warn for movements of different phases, nor of one kind', () => {
    expect(overDashInPhase(movement(false, 1, 1, 20), [movement(true, 2, 2, 15)], 20)).toBe(false);
    expect(overDashInPhase(movement(true, 1, 1, 15), [movement(true, 1, 1, 15)], 20)).toBe(false);
  });
});

describe('a chosen pace of a normal movement', () => {
  const at = (pace: string, freeAction = false) =>
    ({ ...movement(freeAction, 1, 1, 10), movement: { modifiers: { pace }, calculated: { distance: 10 } } }) as unknown as Action;

  it('the round reaches the fastest pace of its normal movements, without free movements or dashes', () => {
    expect(normalMovementPace([at('walk'), at('jog'), at('run', true), at('dash')])).toBe('jog');
    expect(normalMovementPace([])).toBeUndefined();
  });

  it('adds what the pace takes over what the round paid, never less than nothing', () => {
    expect(paceFatigue(undefined, 'walk')).toBe(0);
    expect(paceFatigue('walk', 'jog')).toBeCloseTo(100 / 60);
    expect(paceFatigue(undefined, 'sprint')).toBe(50);
    expect(paceFatigue('run', 'walk')).toBe(0);
  });

  it('matches the fatigue of the AP when the paces are the ones of the AP', () => {
    expect(paceFatigue(paceOfMovementAp(1), paceOfMovementAp(2))).toBeCloseTo(normalMovementFatigue(1, 1));
  });
});
