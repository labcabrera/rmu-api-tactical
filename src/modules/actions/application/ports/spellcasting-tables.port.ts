import type { SpellcastingTables } from '../../domain/services/spell-casting.rules.js';
import type { SpellFailurePp, SpellRealm, SpellType } from '../../domain/value-objects/action-spell.vo.js';

export interface SpellFailureLookup {
  text: string;
  pp: SpellFailurePp;
}

/** Spell Law casting tables served by rmu-api-attack-tables (spec 030): Table 4-2 and Tables 4-4a/b/c. */
export interface SpellcastingTablesPort {
  findModifiers(): Promise<SpellcastingTables>;
  findFailure(realm: SpellRealm, type: SpellType, roll: number): Promise<SpellFailureLookup>;
}

export const SPELLCASTING_TABLES_PORT = Symbol('SpellcastingTablesPort');
