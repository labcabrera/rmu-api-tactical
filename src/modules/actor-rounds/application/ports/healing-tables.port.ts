import type { HealingCombatRules, TreatmentTables } from '../../domain/value-objects/treatment-difficulty.vo.js';

export type {
  CauterizationRow,
  HealingCombatRules,
  TreatmentDifficultyRow,
  TreatmentDuration,
  TreatmentRules,
  TreatmentTables,
} from '../../domain/value-objects/treatment-difficulty.vo.js';

/** The healing tables of core that tactical reads. */
export interface HealingTablesPort {
  /**
   * The treatment difficulties and rules (workspace spec 022); null when core has none (not imported, or imported
   * before spec 022, which answers an empty list).
   */
  treatmentTables(): Promise<TreatmentTables | null>;

  /** The combat rules of workspace spec 068, with defaults for what core does not send. */
  combatRules(): Promise<HealingCombatRules>;
}

export const HEALING_TABLES_PORT = Symbol('HealingTablesPort');

/** The combat rules of core, or null when core cannot serve them (the caller goes on without them). */
export const healingRulesOf = async (port: HealingTablesPort): Promise<HealingCombatRules | null> => {
  try {
    return await port.combatRules();
  } catch {
    return null;
  }
};
