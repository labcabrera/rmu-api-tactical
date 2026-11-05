import type { AttackLocation } from '../../domain/value-objects/attack-location.vo.js';
import { CriticalResult } from '../../domain/value-objects/critical-result.vo.js';

export interface CriticalTableLookupRequest {
  criticalType: string;
  criticalSeverity: string;
  roll: number;
  location: AttackLocation | undefined;
  /**
   * The raw critical roll was a 66 (workspace spec 077, decision B2.5): the lookup keeps the 66 row even with a forced
   * location. Only sent when true.
   */
  natural?: boolean;
}

export interface CriticalTablePort {
  lookup(request: CriticalTableLookupRequest): Promise<CriticalResult>;
}

export const CRITICAL_TABLE_PORT = Symbol('CriticalTablePort');
