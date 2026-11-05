import { ValidationError } from '../../../shared/domain/errors/errors.js';
import { SEVERITIES } from '../../../shared/domain/severity.js';
import type { Difficulty } from '../../../actions/domain/value-objects/difficulty.vo.js';

// ---------------------------------------------------------------------------------------------------------------
// §15.3 Extreme temperatures (workspace spec 079, C3)
// ---------------------------------------------------------------------------------------------------------------

/**
 * What burns or freezes the actor: cold (critical table `O`), heat (`H`) or steam (its own table, `steam`). Workspace
 * spec 079, decision D4: steam counts as heat for the elemental talents.
 */
export const TEMPERATURE_KINDS = ['cold', 'heat', 'steam'] as const;
export type TemperatureKind = (typeof TEMPERATURE_KINDS)[number];

export const TEMPERATURE_CRITICAL_TYPES: Record<TemperatureKind, string> = { cold: 'O', heat: 'H', steam: 'steam' };

/** The element of the kind for the elemental talents (phase 7): steam is heat. */
export const temperatureElement = (kind: TemperatureKind): 'cold' | 'heat' => (kind === 'cold' ? 'cold' : 'heat');

/** Table 15-3, cold side (°C): the highest temperature of each severity, from the mildest. Below the last one, I. */
const COLD_UPPER_BOUNDS: [number, string][] = [
  [-50, 'A'],
  [-76, 'B'],
  [-101, 'C'],
  [-126, 'D'],
  [-151, 'E'],
  [-176, 'F'],
  [-201, 'G'],
  [-226, 'H'],
];
const COLDEST_SEVERITY = 'I';
const COLDEST_BOUND = -250;

/** Table 15-3, heat side (°C): the lowest temperature above which each severity starts. */
const HEAT_LOWER_BOUNDS: [number, string][] = [
  [100, 'A'],
  [150, 'B'],
  [250, 'C'],
  [400, 'D'],
  [550, 'E'],
];
/** Above 800 °C, one severity more for each 300 °C (capped at the top severity). */
const HEAT_E_UPPER = 800;
const HEAT_STEP = 300;

/** Highest temperature (°C) that is extreme cold, lowest that is extreme heat (Table 15-3). */
export const EXTREME_COLD_MAX = -50;
export const EXTREME_HEAT_MIN = 101;

export interface TemperatureSeverity {
  kind: 'cold' | 'heat';
  severity: string;
}

/**
 * Severity of the critical of a temperature in °C (Table 15-3): cold from -50 down to I below -250, heat from 101 up to E
 * at 800 and one more for each 300 above (capped at J). Null in between: not extreme.
 */
export function temperatureSeverity(celsius: number): TemperatureSeverity | null {
  if (!Number.isFinite(celsius)) return null;
  if (celsius <= EXTREME_COLD_MAX) {
    if (celsius < COLDEST_BOUND) return { kind: 'cold', severity: COLDEST_SEVERITY };
    // The mildest bound the temperature is at or below, walking down from -50
    let severity = 'A';
    for (const [bound, value] of COLD_UPPER_BOUNDS) {
      if (celsius <= bound) severity = value;
    }
    return { kind: 'cold', severity };
  }
  if (celsius > HEAT_LOWER_BOUNDS[0][0]) {
    if (celsius > HEAT_E_UPPER) {
      const extra = Math.ceil((celsius - HEAT_E_UPPER) / HEAT_STEP);
      const index = Math.min(SEVERITIES.indexOf('E') + extra, SEVERITIES.length - 1);
      return { kind: 'heat', severity: SEVERITIES[index] };
    }
    let severity = 'A';
    for (const [bound, value] of HEAT_LOWER_BOUNDS) {
      if (celsius > bound) severity = value;
    }
    return { kind: 'heat', severity };
  }
  return null;
}

/** What the game master gives for an extreme temperature: its kind, and its temperature or a severity. */
export interface ExtremeTemperatureInput {
  kind?: TemperatureKind | null;
  /** °C, converted with Table 15-3. */
  temperature?: number | null;
  /** A severity given directly (A-J): contact with frost, fire or steam, set by the game master (§15.3). */
  severity?: string | null;
}

/** An extreme temperature resolved: the critical table and severity it gives. */
export interface ResolvedExtremeTemperature {
  kind: TemperatureKind;
  temperature: number | null;
  criticalType: string;
  severity: string;
  /** Where the severity comes from: Table 15-3 or the game master. */
  severitySource: 'table' | 'given';
}

const GIVEN_SEVERITIES = SEVERITIES.filter(severity => severity !== 'Z');

/**
 * The critical of an extreme temperature (§15.3): a severity given wins; otherwise the temperature through Table 15-3.
 * Steam reads the heat side. `err-temperature-not-extreme` when the temperature gives no critical, or when it is on the
 * other side of the kind asked for (a hot "cold").
 */
export function resolveExtremeTemperature(input: ExtremeTemperatureInput): ResolvedExtremeTemperature {
  const temperature = typeof input.temperature === 'number' && Number.isFinite(input.temperature) ? input.temperature : null;
  const given = input.severity ? input.severity.toUpperCase() : null;
  if (given !== null && !GIVEN_SEVERITIES.includes(given)) {
    throw new ValidationError(`Unknown critical severity '${input.severity}'`, 'validation', { severity: input.severity });
  }
  const fromTable = temperature !== null ? temperatureSeverity(temperature) : null;
  const kind = input.kind ?? fromTable?.kind;
  if (!kind) {
    throw new ValidationError('An extreme temperature needs its kind, or a temperature that is extreme', 'err-temperature-not-extreme', {
      temperature,
    });
  }
  if (given) {
    return { kind, temperature, criticalType: TEMPERATURE_CRITICAL_TYPES[kind], severity: given, severitySource: 'given' };
  }
  if (!fromTable || fromTable.kind !== temperatureElement(kind)) {
    throw new ValidationError(
      `${temperature ?? '-'} °C gives no ${kind} critical (Table 15-3: ${EXTREME_COLD_MAX} or colder, ${EXTREME_HEAT_MIN} or hotter)`,
      'err-temperature-not-extreme',
      { temperature, kind },
    );
  }
  return { kind, temperature, criticalType: TEMPERATURE_CRITICAL_TYPES[kind], severity: fromTable.severity, severitySource: 'table' };
}

// ---------------------------------------------------------------------------------------------------------------
// §15.2 Drowning and suffocation (workspace spec 079, C4)
// ---------------------------------------------------------------------------------------------------------------

/** Rounds a prepared actor holds its breath before its Constitution bonus (§15.2: one minute). */
export const BREATH_PREPARED_BASE_ROUNDS = 12;
/** Fewest rounds anyone holds its breath. */
export const BREATH_MIN_ROUNDS = 1;
/**
 * Difficulty of each check past the limit (§15.2): Easy, then one step harder each round, up to Nearly Impossible.
 */
export const BREATH_CHECK_DIFFICULTIES: Difficulty[] = ['e', 'l', 'm', 'h', 'vh', 'xh', 'sf', 'a', 'ni'];
/** An active Adrenal Focus helps the checks (§15.2). */
export const BREATH_ADRENAL_FOCUS_BONUS = 25;
/** Hits of each round of suffocation: 1d10 (§15.2). */
export const SUFFOCATION_HITS_DIE = 10;
/** Stun of an actor that inhaled water, until it clears its lungs (§15.2). */
export const WATER_INHALED_STUN = -50;

/** What sets how long the actor holds its breath. */
export interface BreathLimitInput {
  prepared: boolean;
  constitutionBonus: number;
  /**
   * Workspace spec 079, D5 (phase 7): Breath Holding replaces the base with its own count of rounds. Missing: the base
   * of §15.2.
   */
  talentRounds?: number | null;
}

/**
 * Rounds the actor holds its breath before the checks (§15.2): 12 plus the Constitution bonus when prepared, the bonus
 * alone otherwise, at least 1.
 */
export function breathLimitRounds(input: BreathLimitInput): number {
  if (typeof input.talentRounds === 'number' && input.talentRounds > 0) {
    return Math.max(BREATH_MIN_ROUNDS, Math.floor(input.talentRounds));
  }
  const bonus = Math.trunc(input.constitutionBonus || 0);
  return Math.max(BREATH_MIN_ROUNDS, (input.prepared ? BREATH_PREPARED_BASE_ROUNDS : 0) + bonus);
}

/** Difficulty of the check number `index` (0 the first one past the limit). */
export function breathCheckDifficulty(index: number): Difficulty {
  const safe = Math.max(0, Math.min(Math.floor(index), BREATH_CHECK_DIFFICULTIES.length - 1));
  return BREATH_CHECK_DIFFICULTIES[safe];
}

/** Rounds the actor has held its breath at the end of `round`, counting the one it started in. */
export function breathHeldRounds(sinceRound: number, round: number): number {
  return Math.max(0, round - sinceRound + 1);
}

/** 1d10 hits of a round of suffocation. */
export function suffocationHits(random: () => number = Math.random): number {
  return Math.min(SUFFOCATION_HITS_DIE, Math.max(1, Math.floor(random() * SUFFOCATION_HITS_DIE) + 1));
}
