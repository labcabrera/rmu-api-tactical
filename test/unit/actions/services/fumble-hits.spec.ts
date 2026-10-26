import { describe, expect, it } from 'vitest';
import { FumbleHits } from '../../../../src/modules/actions/domain/services/fumble-hits.js';
import { CriticalEffect } from '../../../../src/modules/actions/domain/value-objects/critical-result.vo.js';

const hits = (value: number | string) => CriticalEffect.fromTable({ status: 'hits', value });

describe('FumbleHits (workspace spec 034)', () => {
  it('keeps the dice of a table value apart from a number', () => {
    expect(hits('2d10')).toMatchObject({ dice: '2d10', value: undefined });
    expect(hits(5)).toMatchObject({ dice: undefined, value: 5 });
  });

  it('turns a delay in minutes into rounds of 5 seconds', () => {
    expect(CriticalEffect.fromTable({ status: 'unconscious', delayDuration: '1 minute' }).delay).toBe(12);
    expect(CriticalEffect.fromTable({ status: 'unconscious', delay: 5 }).delay).toBe(5);
    expect(CriticalEffect.fromTable({ status: 'dying', delayDuration: '2 hours' }).delay).toBeUndefined();
  });

  it('takes fixed hits as they are, and nothing without hits', () => {
    expect(FumbleHits.resolve([hits(5)])).toBe(5);
    expect(FumbleHits.resolve([CriticalEffect.fromTable({ status: 'fatigue', value: -5 })])).toBe(0);
    expect(FumbleHits.resolve(undefined)).toBe(0);
  });

  it("takes the game master's sum of the dice when it is a possible one", () => {
    expect(FumbleHits.resolve([hits('2d10')], 13)).toBe(13);
    expect(() => FumbleHits.resolve([hits('2d10')], 1)).toThrow(expect.objectContaining({ code: 'err-fumble-invalid-hits' }));
    expect(() => FumbleHits.resolve([hits('1d5')], 6)).toThrow(expect.objectContaining({ code: 'err-fumble-invalid-hits' }));
  });

  it('rolls the dice when the game master gives no sum', () => {
    for (let i = 0; i < 50; i++) {
      const rolled = FumbleHits.resolve([hits('2d10')]);
      expect(rolled).toBeGreaterThanOrEqual(2);
      expect(rolled).toBeLessThanOrEqual(20);
    }
    expect(FumbleHits.diceOf([hits('1d10')])).toBe('1d10');
    expect(FumbleHits.diceOf([hits(3)])).toBeUndefined();
  });
});
