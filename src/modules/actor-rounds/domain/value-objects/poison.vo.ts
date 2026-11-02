import type { InjurySource } from './injury.vo.js';

/**
 * Poisons (workspace spec 042): the poisoning of an actor, the model shared with the strategic API. Time is counted in
 * rounds from the exposure (1 round = 10 seconds, 1 hour = 360 rounds); strategic converts its hours.
 */
export type PoisonCategory = 'circulatory' | 'conversion' | 'muscle' | 'nerve' | 'paralytic' | 'reduction' | 'respiratory' | 'irritant';
export type PoisonSeverity = 'mild' | 'moderate' | 'severe' | 'extreme';
export type PoisonForm = 'liquid' | 'paste' | 'powder' | 'ingest' | 'gas';
export type PoisonTimeUnit = 'round' | 'minute' | 'hour' | 'day';
export type PoisonCondition = 'unconscious' | 'coma' | 'paralyzed' | 'incapacitated' | 'dead';
export type AntidoteSource = 'item' | 'external' | 'magic';

export const POISON_CATEGORIES: PoisonCategory[] = [
  'circulatory',
  'conversion',
  'muscle',
  'nerve',
  'paralytic',
  'reduction',
  'respiratory',
  'irritant',
];
export const POISON_SEVERITIES: PoisonSeverity[] = ['mild', 'moderate', 'severe', 'extreme'];
export const POISON_FORMS: PoisonForm[] = ['liquid', 'paste', 'powder', 'ingest', 'gas'];
export const ANTIDOTE_SOURCES: AntidoteSource[] = ['item', 'external', 'magic'];
/** An antidote of any category. */
export const ANY_POISON = 'any';

/** Rounds in each unit of the poison table. */
export const ROUNDS_PER_UNIT: Record<PoisonTimeUnit, number> = { round: 1, minute: 6, hour: 360, day: 8640 };
export const ROUNDS_PER_HOUR = ROUNDS_PER_UNIT.hour;

export interface PoisonValueRange {
  min: number;
  max: number;
}

export interface PoisonTimeRange extends PoisonValueRange {
  unit: PoisonTimeUnit;
}

/** General effects of one severity of a poison category (Core Law Table 15-6a), as core's poison tables give them. */
export interface PoisonSeverityRow {
  category: PoisonCategory;
  severity: PoisonSeverity;
  start: PoisonTimeRange;
  /** Null lasts until the poisoning is cured. */
  duration: PoisonTimeRange | null;
  penalty: PoisonValueRange | null;
  hitsPerRound: PoisonValueRange | null;
  /** Rounds the hits per round last; null until the victim falls unconscious or the stage ends. */
  hitsRounds: PoisonValueRange | null;
  condition: PoisonCondition | null;
  conditionDelay: PoisonTimeRange | null;
  conditionDuration: PoisonTimeRange | null;
  permanent: boolean;
}

export interface PoisonTables {
  rows: PoisonSeverityRow[];
}

/** The poison of an exposure: a catalog item, or one the game master describes. */
export interface PoisonData {
  itemTypeId?: string;
  name: string;
  category: PoisonCategory;
  level: number;
  form?: PoisonForm;
  /** The worst severity it reaches, whatever the RR. */
  maxSeverity?: PoisonSeverity | null;
  /** Hits taken when the RR fails. */
  immediateHits?: PoisonValueRange | null;
  /** Onset of the mild stage, in rounds: it replaces the one of the table. */
  onsetRounds?: PoisonValueRange | null;
}

/** A poison that reached the actor and waits for its RR (decision 9). */
export interface PoisonExposure {
  id: string;
  poison: PoisonData;
  source: InjurySource;
  createdAt: string;
}

/** One severity of a poisoning, from the mildest to the one the RR reached (decision 5). Times in rounds from the exposure. */
export interface PoisonStage {
  severity: PoisonSeverity;
  startsAt: number;
  /** Null lasts until the poisoning is cured. */
  endsAt: number | null;
  /** Rolled when the poisoning is built and kept (0 or negative). */
  penalty: number;
  hitsPerRound: number;
  /** Last round the hits apply; null until the victim falls unconscious or the stage ends. */
  hitsUntil: number | null;
  condition: PoisonCondition | null;
  conditionAt: number | null;
  /** Null lasts until the poisoning ends. */
  conditionUntil: number | null;
  permanent: boolean;
  started: boolean;
  ended: boolean;
  conditionApplied?: boolean;
}

export interface PoisonRr {
  roll: number;
  bonus: number;
  total: number;
  failure: number;
}

export interface PoisonAntidote {
  at: string;
  source: AntidoteSource;
  name: string;
  itemTypeId?: string;
  level?: number;
  neutralized: boolean;
}

/** The `poison` block of a `poison-disease` injury. */
export interface InjuryPoison {
  itemTypeId?: string;
  name: string;
  category: PoisonCategory;
  level: number;
  form?: PoisonForm;
  rr: PoisonRr;
  severity: PoisonSeverity;
  stages: PoisonStage[];
  /** Rounds since the exposure. */
  elapsedRounds: number;
  exposedAt: string;
  neutralized?: boolean;
  /** Every stage ended (or the poisoning was neutralized): the injury follows the normal recovery. */
  finished?: boolean;
  antidotes?: PoisonAntidote[];
}

/** An antidote given to a poisoned actor (decision 10). */
export interface AntidoteData {
  source: AntidoteSource;
  name: string;
  itemTypeId?: string;
  /** Missing for magic: it neutralizes whatever the category. */
  categories?: string[];
  level?: number;
  withinHours?: number | null;
}
