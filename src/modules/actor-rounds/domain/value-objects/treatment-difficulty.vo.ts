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

/** Rounds a procedure takes in a tactical game (workspace spec 068, decision 2); null: not offered in tactical. */
export interface TreatmentDuration {
  procedure: string;
  rounds: number | null;
  /** The rounds are per point of bleeding (pressure, stitches). */
  perBleeding: boolean;
}

/** A band of Table 13-1c (cauterization) on the Medicine total; null bounds are open. */
export interface CauterizationRow {
  min: number | null;
  max: number | null;
  result: string;
  bleeding: 'unchanged' | 'halved' | 'stopped';
  heatSeverity: string | null;
  /** Number of d10 of extra hits. */
  hitsDice: number;
}

export interface TreatmentLimitsRules {
  splint: { leg: { pace: string }; arm: { limbUnusable: boolean } };
  cast: { leg: { pace: string; cane: string; crutches: string }; maneuverPenaltyFactor: number };
}

/**
 * The healing rules of core that tactical uses in combat (workspace spec 068, §1). The adapter fills what an older core
 * document lacks with neutral defaults (no rows: one round per procedure, no surgery requirement, no heat).
 */
export interface HealingCombatRules {
  treatmentDurations: TreatmentDuration[];
  cauterization: CauterizationRow[];
  cauterizationUnusualRoll: number | null;
  surgeryRequired: { injuryType: string; severity: string }[];
  treatmentLimits: TreatmentLimitsRules | null;
  tourniquet: { loosenEveryRounds: number; graceRounds: number };
  stabilize: { difficulty: string; successRounds: number; absoluteRounds: number };
  salveModifier: { min: number; max: number };
  combatItemAp: number;
}

/** Defaults of a core without the spec 068 fields (the spec's own numbers, decisions 5 to 7 and 13). */
export const DEFAULT_HEALING_COMBAT_RULES: HealingCombatRules = {
  treatmentDurations: [],
  cauterization: [],
  cauterizationUnusualRoll: null,
  surgeryRequired: [],
  treatmentLimits: null,
  tourniquet: { loosenEveryRounds: 10, graceRounds: 2 },
  stabilize: { difficulty: 'm', successRounds: 1, absoluteRounds: 2 },
  salveModifier: { min: -25, max: 25 },
  combatItemAp: 2,
};
