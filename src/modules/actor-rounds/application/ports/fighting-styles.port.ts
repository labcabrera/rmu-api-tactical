import type { FightingStyleCatalog } from '../../domain/value-objects/fighting-style-catalog.vo.js';

/** Fighting styles of rmu-api-core (workspace spec 032). */
export interface FightingStylesPort {
  getFightingStyles(): Promise<FightingStyleCatalog>;
}

export const FIGHTING_STYLES_PORT = Symbol('FightingStylesPort');
