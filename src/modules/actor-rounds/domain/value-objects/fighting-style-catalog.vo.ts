/** Fighting styles of rmu-api-core (GET /v1/fighting-styles), with the fields this API reads (workspace spec 032). */
export interface FightingStyleCatalog {
  styles: CatalogFightingStyle[];
  abilities: CatalogStyleAbility[];
}

export interface StyleCondition {
  kind: string;
  value?: string;
}

/** Alternatives of conditions: met when every condition of any alternative holds. Empty means no requirement. */
export type StyleEquipment = StyleCondition[][];

export interface CatalogFightingStyle {
  id: string;
  skillId: string;
  abilities: { abilityId: string; cost: number }[];
  equipment: StyleEquipment;
}

export interface CatalogStyleAbility {
  id: string;
  equipment: StyleEquipment;
}
