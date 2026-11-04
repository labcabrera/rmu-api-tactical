import { ValidationError } from '../errors/errors.js';

/** Which ends of a d100 open the roll: both (maneuvers, §5.1), high (attacks), low, or none (a closed d100). */
export type OpenEndedMode = 'both' | 'high' | 'low' | 'none';

/** First die that opens the roll high, and last die that opens it low (96 and 5 without luck talents). */
export interface OpenEndedThresholds {
  highFrom: number;
  lowTo: number;
}

export const DEFAULT_OPEN_ENDED: OpenEndedThresholds = { highFrom: 96, lowTo: 5 };

export const ERR_ROLL_OPEN_ENDED_INVALID = 'err-roll-open-ended-invalid';

const MIN_DIE = 1;
const MAX_DIE = 100;

/** What the client says the dice add up to: the total and the first die, when it sends them. */
export interface OpenEndedClaim {
  total?: number | null;
  unmodified?: number | null;
}

const invalid = (message: string, dice: number[], thresholds: OpenEndedThresholds): ValidationError =>
  new ValidationError(message, ERR_ROLL_OPEN_ENDED_INVALID, { dice, highFrom: thresholds.highFrom, lowTo: thresholds.lowTo });

/**
 * Total of a chain of d100 dice that is complete with these thresholds (workspace spec 076, §2.8): a first die from
 * `highFrom` (or up to `lowTo`) opens the roll; each further die adds (or subtracts), and another one follows while
 * the last is from `highFrom`. A first die that does not open it is the whole roll.
 */
export const openEndedTotal = (dice: number[], mode: OpenEndedMode, thresholds: OpenEndedThresholds = DEFAULT_OPEN_ENDED): number => {
  if (dice.length === 0) {
    throw invalid('The roll has no dice', dice, thresholds);
  }
  if (dice.some(die => !Number.isInteger(die) || die < MIN_DIE || die > MAX_DIE)) {
    throw invalid(`Every die of the roll is from ${MIN_DIE} to ${MAX_DIE}`, dice, thresholds);
  }
  const [first, ...rest] = dice;
  const opensHigh = (mode === 'both' || mode === 'high') && first >= thresholds.highFrom;
  const opensLow = (mode === 'both' || mode === 'low') && first <= thresholds.lowTo;
  if (!opensHigh && !opensLow) {
    if (rest.length > 0) {
      throw invalid(`A first die of ${first} does not open the roll`, dice, thresholds);
    }
    return first;
  }
  if (rest.length === 0) {
    throw invalid(`A first die of ${first} opens the roll: it needs another die`, dice, thresholds);
  }
  rest.forEach((die, index) => {
    const last = index === rest.length - 1;
    if (!last && die < thresholds.highFrom) {
      throw invalid(`The die ${die} does not open the roll further: no more dice follow it`, dice, thresholds);
    }
    if (last && die >= thresholds.highFrom) {
      throw invalid(`The die ${die} opens the roll further: it needs another die`, dice, thresholds);
    }
  });
  const sign = opensHigh ? 1 : -1;
  return first + sign * rest.reduce((sum, die) => sum + die, 0);
};

/**
 * Checks the dice a client sent with a roll (workspace spec 076, §2.8), only when it sent them: the chain must be the
 * one the thresholds of the actor make (`err-roll-open-ended-invalid`), its first die the unmodified roll and its sum
 * the total, when those are sent too.
 */
export const checkOpenEndedDice = (
  dice: number[] | null | undefined,
  mode: OpenEndedMode,
  thresholds: OpenEndedThresholds = DEFAULT_OPEN_ENDED,
  claim: OpenEndedClaim = {},
): void => {
  if (dice === undefined || dice === null) {
    return;
  }
  const total = openEndedTotal(dice, mode, thresholds);
  if (claim.unmodified !== undefined && claim.unmodified !== null && claim.unmodified !== dice[0]) {
    throw invalid(`The first die is ${dice[0]}, not ${claim.unmodified}`, dice, thresholds);
  }
  if (claim.total !== undefined && claim.total !== null && claim.total !== total) {
    throw invalid(`The dice add up to ${total}, not ${claim.total}`, dice, thresholds);
  }
};
