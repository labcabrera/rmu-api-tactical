import type { PoisonTables } from '../../../actor-rounds/domain/value-objects/poison.vo.js';

/** The poison tables of core (workspace spec 042, Core Law Table 15-6a). */
export interface PoisonTablesPort {
  /** The tables; a 422 `err-poison-tables-missing` when core has not imported them. */
  find(): Promise<PoisonTables>;
}

export const POISON_TABLES_PORT = Symbol('PoisonTablesPort');
