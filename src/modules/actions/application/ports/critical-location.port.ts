import type { CriticalLocationRange } from '../../domain/services/critical-location.js';

/**
 * The roll → location map that every critical table shares (Core Law §7.2), from rmu-api-attack-tables. The location
 * of a critical roll is known before the critical type (workspace spec 077, decision B2.2).
 */
export interface CriticalLocationPort {
  findLocations(): Promise<CriticalLocationRange[]>;
}

export const CRITICAL_LOCATION_PORT = Symbol('CriticalLocationPort');
