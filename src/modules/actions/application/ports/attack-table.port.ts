import { AttackTableEntry } from '../../domain/value-objects/action-attack.vo';
import { AttackLocation } from '../../domain/value-objects/attack-location.vo';

export interface AttackTableArmor {
  at: number | null;
  headAt: number | null;
  bodyAt: number | null;
  armsAt: number | null;
  legsAt: number | null;
}

export interface AttackTableLookupRequest {
  attackTable: string;
  attackType: string;
  attackSize: number;
  roll: number;
  armor: AttackTableArmor;
  location: AttackLocation | undefined;
}

export interface AttackTablePort {
  lookup(request: AttackTableLookupRequest): Promise<AttackTableEntry>;
}
