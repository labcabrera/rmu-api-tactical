import type { PsychologyTables } from '../../domain/value-objects/psychology-tables.vo.js';

/** The psychology tables of core (workspace spec 022). */
export interface PsychologyTablesPort {
  /** The tables; a 422 `err-psychology-tables-missing` when core has not imported them. */
  find(): Promise<PsychologyTables>;
}

export const PSYCHOLOGY_TABLES_PORT = Symbol('PsychologyTablesPort');
