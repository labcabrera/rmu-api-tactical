import { describe, expect, it } from 'vitest';
import { hitMultiplierOf, SIZE_SCALE, sizeClassOf, sizeEntryOf, stepsOf } from '../../../src/modules/shared/domain/size-scale.js';

describe('size scale (spec 075, decision 1)', () => {
  it('has thirteen sizes, medium is class 5 and 0 steps', () => {
    expect(SIZE_SCALE).toHaveLength(13);
    expect(SIZE_SCALE.map(entry => entry.hitMultiplier)).toEqual([0.25, 0.5, 0.67, 0.75, 1, 1.5, 2, 3, 4, 5, 6, 7, 8]);
    expect(sizeEntryOf(0)).toEqual({ id: 'medium', sizeClass: 5, steps: 0, hitMultiplier: 1 });
  });

  it.each([
    ['minuscule', -4, 1],
    ['small', -1, 4],
    ['medium', 0, 5],
    ['big', 1, 6],
    ['huge', 3, 8],
    ['leviathan', 8, 13],
  ])('%s is %i steps, class %i', (sizeId, steps, sizeClass) => {
    expect(stepsOf(sizeId)).toBe(steps);
    expect(sizeClassOf(sizeId)).toBe(sizeClass);
  });

  it('gives no steps for an unknown id', () => {
    expect(stepsOf('colossal')).toBeUndefined();
    expect(stepsOf(undefined)).toBeUndefined();
  });

  it('gives the Hit Multiplier of a number of steps, clamped to the ends', () => {
    expect(hitMultiplierOf(1)).toBe(1.5);
    expect(hitMultiplierOf(3)).toBe(3);
    expect(hitMultiplierOf(-2)).toBe(0.67);
    expect(hitMultiplierOf(-9)).toBe(0.25);
    expect(hitMultiplierOf(20)).toBe(8);
    expect(hitMultiplierOf(Number.NaN)).toBe(1);
  });
});
