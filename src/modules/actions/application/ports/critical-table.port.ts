import type { AttackLocation } from '../../domain/value-objects/attack-location.vo.js';
import { CriticalResult } from '../../domain/value-objects/critical-result.vo.js';

export interface CriticalTableLookupRequest {
  criticalType: string;
  criticalSeverity: string;
  roll: number;
  location: AttackLocation | undefined;
}

export interface CriticalTablePort {
  lookup(request: CriticalTableLookupRequest): Promise<CriticalResult>;
}

export const CRITICAL_TABLE_PORT = Symbol('CriticalTablePort');
