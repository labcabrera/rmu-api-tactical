/** One month of creations, `YYYY-MM` in UTC. */
export interface MonthCount {
  month: string;
  count: number;
}

/** How many documents a collection holds, by status when it has one, and how many were created each month. */
export interface CollectionStats {
  total: number;
  byStatus?: Record<string, number>;
  createdByMonth: MonthCount[];
}

/** Months of the creation series, the current one included. */
export const STATS_MONTHS = 12;

/** The `YYYY-MM` of the last `months` months up to `now` (UTC), oldest first. */
export function lastMonths(now: Date, months = STATS_MONTHS): string[] {
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - index), 1));
    return date.toISOString().slice(0, 7);
  });
}

/** First instant (UTC) of the month of `now`. */
export function startOfMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}
