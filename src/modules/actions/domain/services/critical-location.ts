import { type AttackLocation, toAttackLocation } from '../value-objects/attack-location.vo.js';

/** A band of critical rolls and the location it hits; null when the band hits no location. */
export interface CriticalLocationRange {
  from: number;
  to: number;
  location: AttackLocation | null;
}

/** The location a critical roll hits, from the map shared by the critical tables; undefined out of the map. */
export const locationOfRoll = (ranges: CriticalLocationRange[], roll: number): AttackLocation | undefined =>
  ranges.find(range => roll >= range.from && roll <= range.to)?.location ?? undefined;

/** The map as rmu-api-attack-tables returns it: the limbs in singular. Bands of unknown locations hit none. */
export const toCriticalLocationRanges = (ranges: { from: number; to: number; location: string | null }[]): CriticalLocationRange[] =>
  ranges.map(range => ({ from: range.from, to: range.to, location: toAttackLocation(range.location) ?? null }));

/**
 * Workspace spec 077, decision B2.3: the location to force in the lookup of a critical. Only when the row of the adjusted
 * roll is of another location: a row already of the location hit is taken as it is (and so is its 66).
 */
export const locationToForce = (
  ranges: CriticalLocationRange[],
  location: AttackLocation | undefined,
  adjustedRoll: number,
): AttackLocation | undefined => (location && locationOfRoll(ranges, adjustedRoll) !== location ? location : undefined);
