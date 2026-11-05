import type { CriticalLocationPort } from '../../src/modules/actions/application/ports/critical-location.port.js';
import type { CriticalLocationRange } from '../../src/modules/actions/domain/services/critical-location.js';

/**
 * A made-up roll → location map of the critical tables (workspace spec 077, B2): not the books' bands. The tests read
 * 21-25 as the chest, 66 as the abdomen, 81-85 as the head and 51-55 as the chest.
 */
export const CRITICAL_LOCATIONS: CriticalLocationRange[] = [
  { from: 1, to: 5, location: 'legs' },
  { from: 6, to: 10, location: 'arms' },
  { from: 11, to: 15, location: 'legs' },
  { from: 16, to: 20, location: 'arms' },
  { from: 21, to: 25, location: 'chest' },
  { from: 26, to: 30, location: 'abdomen' },
  { from: 31, to: 35, location: 'legs' },
  { from: 36, to: 40, location: 'arms' },
  { from: 41, to: 45, location: 'chest' },
  { from: 46, to: 50, location: 'abdomen' },
  { from: 51, to: 55, location: 'chest' },
  { from: 56, to: 60, location: 'legs' },
  { from: 61, to: 65, location: 'arms' },
  { from: 66, to: 66, location: 'abdomen' },
  { from: 67, to: 70, location: 'chest' },
  { from: 71, to: 75, location: 'legs' },
  { from: 76, to: 80, location: 'arms' },
  { from: 81, to: 85, location: 'head' },
  { from: 86, to: 90, location: 'chest' },
  { from: 91, to: 95, location: 'abdomen' },
  { from: 96, to: 100, location: 'head' },
];

/** The critical location port answering the made-up map. */
export const fakeCriticalLocationPort = (ranges: CriticalLocationRange[] = CRITICAL_LOCATIONS): CriticalLocationPort => ({
  findLocations: () => Promise.resolve(ranges),
});
