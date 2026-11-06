import { AttackTableEntry } from '../../domain/value-objects/action-attack.vo.js';
import type { AttackLocation } from '../../domain/value-objects/attack-location.vo.js';

/** Lookup on the Medium table (spec 033): the attack size is applied by the attack-size combat plugin. */
export interface AttackTableLookupRequest {
  attackTable: string;
  /** Roll total; the adapter clamps it to the table range (1..175). */
  roll: number;
  /** Armour type; the adapter clamps it to the table range (1..10). */
  armor: number | undefined;
  location: AttackLocation | undefined;
}

/** A disarm or subdual modifier of a table: in melee (or the only use) and thrown (null when it is not thrown). */
export interface SpecialManeuverTableModifier {
  melee: number;
  ranged: number | null;
}

/** Disarm and subdual modifiers of an attack table (workspace spec 079, A7); null when the maneuver does not apply. */
export interface AttackTableModifiers {
  disarm: SpecialManeuverTableModifier | null;
  subdual: SpecialManeuverTableModifier | null;
}

export interface AttackTablePort {
  lookup(request: AttackTableLookupRequest): Promise<AttackTableEntry>;
}

export const ATTACK_TABLE_PORT = Symbol('AttackTablePort');

/** Workspace spec 079, A7: the disarm and subdual modifiers of the tables, only read for a disarm or subdual attack. */
export interface AttackTableModifiersPort {
  modifiers(attackTable: string): Promise<AttackTableModifiers>;
}

export const ATTACK_TABLE_MODIFIERS_PORT = Symbol('AttackTableModifiersPort');
