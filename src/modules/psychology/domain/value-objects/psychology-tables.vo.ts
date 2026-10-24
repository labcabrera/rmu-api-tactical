/**
 * Psychology tables of core (`GET /v1/psychology-tables`, workspace spec 022, decision 2): Tables 14-3a, 14-3b, 14-3c
 * and the resistance roll table (5-6) as numbers and result keys, never text. Ranges include both ends; null is open.
 */
export interface TableBand {
  min: number | null;
  max: number | null;
}

/** Fear states by how much the fear RR failed (Table 14-3a), mildest first. */
export type FearState = 'balk' | 'retreat' | 'routed' | 'broken';
export const FEAR_STATES: FearState[] = ['balk', 'retreat', 'routed', 'broken'];

/** Failure severities of a resistance roll (Table 5-6), mildest first. */
export type FailureSeverity = 'mild' | 'moderate' | 'severe' | 'extreme';

export interface FrightLevel {
  key: string;
  level: number;
}

export interface FearResultRow extends TableBand {
  severity: FailureSeverity;
  result: FearState;
  rallyModifier: number;
}

export interface MoraleRow extends TableBand {
  result: string;
  outcome: string;
  moraleModifier?: number | null;
  moraleModifierDays?: number | null;
}

export interface UnusualEventRow {
  roll: number;
  outcome: string;
  [key: string]: number | string;
}

export interface RallyRow extends TableBand {
  result: string;
  /** Severity steps the fear changes by: negative calms it down. */
  fearSeverityChange: number;
}

export interface RallyGroupModifier {
  followersPerStep: number;
  modifier: number;
}

export interface ResistanceBandRow extends TableBand {
  result: string;
  severity: FailureSeverity;
}

export interface ResistanceRollRules {
  requiredTotal: number;
  attackLevelMultiplier: number;
  targetLevelMultiplier: number;
  ownRealmBonus: number;
  stats: Record<string, string>;
  fearIgnoresInjuryPenalties: boolean;
}

export interface PsychologyTables {
  frightLevels: FrightLevel[];
  frightLevelModifiers: FrightLevel[];
  fearResults: FearResultRow[];
  morale: MoraleRow[];
  moraleUnusualEvent?: UnusualEventRow | null;
  rally: RallyRow[];
  rallyUnusualEvent?: UnusualEventRow | null;
  rallyGroupModifier: RallyGroupModifier;
  resistance: ResistanceBandRow[];
  resistanceRoll: ResistanceRollRules;
}

/** The row of a table whose band holds the value. */
export const findBand = <T extends TableBand>(rows: T[], value: number): T | undefined =>
  rows.find(
    row =>
      (row.min === null || row.min === undefined || value >= row.min) && (row.max === null || row.max === undefined || value <= row.max),
  );
