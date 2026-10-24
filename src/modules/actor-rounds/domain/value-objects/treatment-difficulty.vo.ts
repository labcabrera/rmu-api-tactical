/**
 * A row of the treatment difficulty table of core (`GET /v1/healing-tables`, `treatmentDifficulties`, workspace spec
 * 022, decision 2): the difficulty (a key of Table 5-1) of a procedure on an injury type and severity. No row: the
 * procedure does not apply. Magic is not a Medicine maneuver and has none.
 */
export interface TreatmentDifficultyRow {
  procedure: string;
  injuryType: string;
  severity: string;
  difficulty: string;
}

/** `treatmentRules` of core's healing tables. */
export interface TreatmentRules {
  /** Steps of Table 5-1 harder on the head. */
  headDifficultySteps: number;
  /** Modifier per point of bleeding when cauterizing (negative). */
  cauterizePenaltyPerBleeding: number;
  tourniquetLocations?: string[];
}

/** The treatment tables of core: rows and rules. */
export interface TreatmentTables {
  difficulties: TreatmentDifficultyRow[];
  rules: TreatmentRules;
}
