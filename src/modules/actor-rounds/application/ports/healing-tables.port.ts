import type { TreatmentTables } from '../../domain/value-objects/treatment-difficulty.vo.js';

export type { TreatmentDifficultyRow, TreatmentRules, TreatmentTables } from '../../domain/value-objects/treatment-difficulty.vo.js';

/** The healing tables of core that tactical reads. */
export interface HealingTablesPort {
  /**
   * The treatment difficulties and rules (workspace spec 022); null when core has none (not imported, or imported
   * before spec 022, which answers an empty list).
   */
  treatmentTables(): Promise<TreatmentTables | null>;
}

export const HEALING_TABLES_PORT = Symbol('HealingTablesPort');
