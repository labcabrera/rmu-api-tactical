import { UnprocessableEntityError } from './errors/errors.js';

/**
 * Critical severities (§9.4): Z is the lower result of the A column, J the top one the critical expansion knows. Shared
 * by the attacks (the combat plugins) and the attacks without an attacker, such as falls (workspace spec 077, D1).
 */
export const SEVERITIES = ['Z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const A_INDEX = SEVERITIES.indexOf('A');

/**
 * Keys of the steps that move the critical severity (§9.4, T-3.1d, T-3.1e; workspace spec 075, decision 3).
 * `fall-control`: the Acrobatics maneuver of a fall (workspace spec 077, decision D4). `adrenal-strength`: the attack
 * sizes of an active Adrenal Strength (§3.4; workspace spec 079, decision B3). `elemental-talent`: Elemental Resistance
 * or Susceptibility on a fixed critical of its element without a roll (workspace spec 079, D4).
 */
export type SeverityAdjustmentKey =
  | 'attack-size'
  | 'adrenal-strength'
  | 'charge'
  | 'fighting-style'
  | 'target-size'
  | 'light-boned'
  | 'critical-code'
  | 'fall-control'
  | 'elemental-talent';

/** Order the steps are listed in. */
const SEVERITY_KEYS: SeverityAdjustmentKey[] = [
  'attack-size',
  'adrenal-strength',
  'charge',
  'fighting-style',
  'target-size',
  'light-boned',
  'critical-code',
  'fall-control',
  'elemental-talent',
];

export interface SeverityAdjustmentStep {
  key: SeverityAdjustmentKey;
  value: number;
}

/** The steps that move a critical severity, in their order, only the non-zero ones. */
export const severitySteps = (values: Partial<Record<SeverityAdjustmentKey, number>>): SeverityAdjustmentStep[] =>
  SEVERITY_KEYS.map(key => ({ key, value: values[key] || 0 })).filter(step => step.value !== 0);

/**
 * The severity after the steps, capped at J. One step below A is Z, the lower result of the A column (§9.4); two or
 * more below A, or any below A with the code I (T-3.1e), give no critical: null (workspace spec 075, decision 4).
 */
export const adjustSeverity = (original: string, total: number, reduceSeverity: boolean): string | null => {
  const index = SEVERITIES.indexOf(original) + total;
  if (index >= A_INDEX) {
    return SEVERITIES[Math.min(index, SEVERITIES.length - 1)];
  }
  return index === A_INDEX - 1 && !reduceSeverity ? 'Z' : null;
};

/**
 * The severity no worse than `cap` (workspace spec 079, decision A4: the hazard of a knock-back gives no critical worse
 * than the one that provoked it). Null stays null; without a cap it does not change.
 */
export const capSeverity = (severity: string | null, cap: string | null | undefined): string | null => {
  if (!severity || !cap || !SEVERITIES.includes(cap)) {
    return severity;
  }
  return SEVERITIES.indexOf(severity) > SEVERITIES.indexOf(cap) ? cap : severity;
};

/**
 * Severities with a table (Z, A..E) give one critical; F..I give an E plus lighter ones. J is E, C, B: the Python
 * calculator had J, C, B, but there is no J table to roll on.
 */
const CRITICALS_BY_SEVERITY: Record<string, string[]> = {
  Z: ['Z'],
  A: ['A'],
  B: ['B'],
  C: ['C'],
  D: ['D'],
  E: ['E'],
  F: ['E', 'A'],
  G: ['E', 'B'],
  H: ['E', 'C'],
  I: ['E', 'C', 'A'],
  J: ['E', 'C', 'B'],
};

/** The criticals rolled for a severity (§9.4): one for A..E, several above E. */
export const expandSeverity = (severity: string): string[] => {
  const severities = CRITICALS_BY_SEVERITY[severity];
  if (!severities) {
    throw new UnprocessableEntityError(`Invalid critical severity: ${severity}`);
  }
  return [...severities];
};
