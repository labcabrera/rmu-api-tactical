import { AttackTableEntry } from '../../domain/value-objects/action-attack.vo';
import { AttackLocation } from '../../domain/value-objects/attack-location.vo';

export interface AttackTableLookupRequest {
  attackTable: string;
  attackSize: number;
  roll: number;
  armor: number;
  location: AttackLocation | undefined;
}

export interface AttackTablePort {
  lookup(request: AttackTableLookupRequest): Promise<AttackTableEntry>;
}
