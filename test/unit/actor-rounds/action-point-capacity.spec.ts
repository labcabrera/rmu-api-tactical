import { ActionPointCapacity } from '../../../src/modules/actor-rounds/domain/services/action-point-capacity.js';
import { ApModifier } from '../../../src/modules/actor-rounds/domain/value-objects/ap-modifier.vo.js';

const bonus = (value: number) => new ApModifier('haste', 'bonus', value);
const loss = (value: number, source: 'surprised' | 'hold' = 'surprised') => new ApModifier(source, 'loss', value);
const staggered = (phase: number, value = 1) => new ApModifier('staggered', 'loss', value, phase);
const cap = (value: number) => new ApModifier('cap', 'cap', value);
const capacity = (modifiers: ApModifier[], spent?: number[]) => ActionPointCapacity.compute(modifiers, { spent }).capacity;

describe('ActionPointCapacity (spec 011, §1)', () => {
  it('gives 1 AP per phase without modifiers', () => {
    expect(ActionPointCapacity.compute([])).toEqual({ capacity: [1, 1, 1, 1], pendingLoss: 0, pendingByEffect: {}, costMultiplier: 1 });
  });

  it('adds the bonuses one by one from phase 4 backwards, and round again', () => {
    expect(capacity([bonus(2)])).toEqual([1, 1, 2, 2]);
    expect(capacity([bonus(1), bonus(1)])).toEqual([1, 1, 2, 2]);
    expect(capacity([bonus(5)])).toEqual([2, 2, 2, 3]);
  });

  it('takes the losses without a phase from phase 1 forwards, never below 0', () => {
    expect(capacity([loss(2)])).toEqual([0, 0, 1, 1]);
    expect(capacity([loss(3, 'hold')])).toEqual([0, 0, 0, 1]);
    expect(capacity([loss(6, 'hold')])).toEqual([0, 0, 0, 0]);
  });

  it('applies the bonuses before the losses: surprised 2 with haste 2', () => {
    expect(capacity([loss(2), bonus(2)])).toEqual([0, 0, 2, 2]);
  });

  it('takes a staggered AP from its phase when it has capacity left', () => {
    expect(capacity([staggered(2)])).toEqual([1, 0, 1, 1]);
  });

  it('takes a staggered AP from the next phase with capacity left when its phase is spent', () => {
    expect(capacity([staggered(2)], [1, 1, 0, 0])).toEqual([1, 1, 0, 1]);
    expect(capacity([staggered(2, 2)], [1, 1, 0, 0])).toEqual([1, 1, 0, 0]);
  });

  it('leaves a staggered AP pending for the next round when the round has no capacity left', () => {
    const result = ActionPointCapacity.compute([staggered(4, 2)], { spent: [1, 1, 1, 0] });

    expect(result.capacity).toEqual([1, 1, 1, 0]);
    expect(result.pendingLoss).toBe(1);
    expect(ActionPointCapacity.compute([staggered(5)]).pendingLoss).toBe(1);
  });

  it('caps the total taking AP from phase 1, after the bonuses and losses', () => {
    expect(capacity([cap(2)])).toEqual([0, 0, 1, 1]);
    expect(capacity([cap(2), bonus(2)])).toEqual([0, 0, 0, 2]);
    expect(capacity([cap(5)])).toEqual([1, 1, 1, 1]);
    expect(capacity([cap(3), cap(2)])).toEqual([0, 0, 1, 1]);
  });

  it('leaves a flatfooted actor (cap 0) without AP', () => {
    expect(capacity([new ApModifier('flatfooted', 'cap', 0), bonus(2)])).toEqual([0, 0, 0, 0]);
  });

  it('gives the concentration cost multiplier without applying it', () => {
    const result = ActionPointCapacity.compute([new ApModifier('concentration', 'cost-multiplier', 2)]);

    expect(result.capacity).toEqual([1, 1, 1, 1]);
    expect(result.costMultiplier).toBe(2);
  });
});
