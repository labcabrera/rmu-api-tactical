import { CriticalResult } from '../../domain/value-objects/action-attack.vo';
import { AttackLocation } from '../../domain/value-objects/attack-location.vo';

export interface CriticalTableLookupRequest {
  criticalType: string;
  criticalSeverity: string;
  roll: number;
  location: AttackLocation | undefined;
}

export interface CriticalTablePort {
  lookup(request: CriticalTableLookupRequest): Promise<CriticalResult>;
}
