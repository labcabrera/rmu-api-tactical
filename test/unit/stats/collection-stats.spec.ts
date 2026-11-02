import { lastMonths, startOfMonth } from '../../../src/modules/stats/domain/collection-stats.js';

describe('collection stats months', () => {
  it('lists the last twelve months up to the current one, oldest first, across a change of year', () => {
    const months = lastMonths(new Date('2026-02-15T10:00:00Z'));
    expect(months).toHaveLength(12);
    expect(months[0]).toBe('2025-03');
    expect(months.at(-1)).toBe('2026-02');
  });

  it('starts the month at midnight UTC', () => {
    expect(startOfMonth(new Date('2026-10-30T23:59:00Z')).toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });
});
