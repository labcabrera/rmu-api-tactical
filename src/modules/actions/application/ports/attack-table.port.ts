import { AttackTableEntry } from '../../domain/value-objects/action-attack.vo.js';
import type { AttackLocation } from '../../domain/value-objects/attack-location.vo.js';

export interface AttackTableLookupRequest {
  attackTable: string;
  attackSize: number;
  /** Roll total; the adapter clamps it to the table range (1..175). */
  roll: number;
  /** Armour type; the adapter clamps it to the table range (1..10). */
  armor: number | undefined;
  location: AttackLocation | undefined;
}

export interface AttackTablePort {
  lookup(request: AttackTableLookupRequest): Promise<AttackTableEntry>;
}

export const ATTACK_TABLE_PORT = Symbol('AttackTablePort');
