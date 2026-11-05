import { ValidationError } from '../../../shared/domain/errors/errors.js';
import type { Difficulty } from '../value-objects/difficulty.vo.js';

/** Skill of a feat of strength (§5.2). */
export const WEIGHT_TRAINING_SKILL_ID = 'weight-training';

/** Rule reference of a feat of strength. */
export const FEAT_OF_STRENGTH_RULE = '§5.2, Table 5-2';

/**
 * Table 5-2 as numbers: the most load (percent of the body weight, less 2 × St bonus) of each difficulty. The column is
 * read as an upper bound (60 % is Hard); beyond 400 % the feat stays Nigh Impossible and the game master may rule it out.
 */
export const FEAT_OF_STRENGTH_BANDS: { maxPercent: number; difficulty: Difficulty }[] = [
  { maxPercent: 5, difficulty: 'c' },
  { maxPercent: 10, difficulty: 's' },
  { maxPercent: 20, difficulty: 'r' },
  { maxPercent: 30, difficulty: 'e' },
  { maxPercent: 40, difficulty: 'l' },
  { maxPercent: 50, difficulty: 'm' },
  { maxPercent: 75, difficulty: 'h' },
  { maxPercent: 100, difficulty: 'vh' },
  { maxPercent: 150, difficulty: 'xh' },
  { maxPercent: 200, difficulty: 'sf' },
  { maxPercent: 300, difficulty: 'a' },
  { maxPercent: 400, difficulty: 'ni' },
];

/**
 * Weight multiplier of Adrenal Strength (§3.4) by its attack size steps: ×4 (success), ×8 (the doubled round of an
 * absolute success), ×1/4 (after an absolute failure).
 */
export const adrenalStrengthWeightMultiplier = (steps: number): number => {
  if (steps >= 2) return 8;
  if (steps === 1) return 4;
  if (steps < 0) return 0.25;
  return 1;
};

/** What the feat of strength is: the load and the mechanical advantage the game master rules. */
export interface FeatOfStrengthChoices {
  /** Weight of the load, in pounds. */
  loadWeight: number;
  /** Part of the weight that counts after the mechanical advantage (§5.2): 1 by default, 0.5 dragged, down to 0.01. */
  mechanicalFactor?: number;
  /** Body weight of an actor without a sheet that gives it (an NPC), in pounds. */
  bodyWeight?: number;
  /** Strength bonus of an actor without a sheet that gives it (an NPC); 0 when left out. */
  strengthBonus?: number;
}

/** The difficulty of a feat of strength and how it was found (the explanation of the maneuver). */
export interface FeatOfStrengthResult {
  loadWeight: number;
  mechanicalFactor: number;
  /** Weight that counts: the load times the mechanical factor. */
  effectiveLoad: number;
  bodyWeight: number;
  /** Adrenal Strength multiplier of the body weight (1 without it). */
  weightMultiplier: number;
  strengthBonus: number;
  /** Load as a percent of the body weight (times the multiplier), rounded down as the book's example does. */
  percent: number;
  /** The percent less 2 × St bonus, the row of Table 5-2. */
  adjustedPercent: number;
  difficulty: Difficulty;
  /** Beyond the 400 % of the table. */
  beyondTable: boolean;
}

/** Reasons of `err-feat-of-strength-invalid` (`details.reason`). */
export type FeatOfStrengthInvalidReason = 'skill' | 'load' | 'mechanical-factor' | 'body-weight';

const MIN_MECHANICAL_FACTOR = 0.01;

/**
 * Difficulty of a feat of strength (§5.2, Table 5-2; workspace spec 079, decision B2): the effective load (the load
 * times the mechanical factor) as a percent of the body weight (times the Adrenal Strength multiplier), less 2 × St
 * bonus, read on the table as an upper bound.
 */
export const featOfStrengthDifficulty = (
  choices: FeatOfStrengthChoices,
  bodyWeight: number | null | undefined,
  strengthBonus: number,
  weightMultiplier = 1,
): FeatOfStrengthResult => {
  const loadWeight = choices.loadWeight;
  if (typeof loadWeight !== 'number' || !Number.isFinite(loadWeight) || loadWeight <= 0) {
    throw new ValidationError('A feat of strength needs the weight of the load', 'err-feat-of-strength-invalid', { reason: 'load' });
  }
  const mechanicalFactor = choices.mechanicalFactor ?? 1;
  if (!Number.isFinite(mechanicalFactor) || mechanicalFactor < MIN_MECHANICAL_FACTOR || mechanicalFactor > 1) {
    throw new ValidationError('The mechanical factor goes from 0.01 to 1', 'err-feat-of-strength-invalid', {
      reason: 'mechanical-factor',
    });
  }
  if (!bodyWeight || bodyWeight <= 0) {
    throw new ValidationError('Send the body weight of the actor', 'err-feat-of-strength-invalid', { reason: 'body-weight' });
  }
  const effectiveLoad = Math.round(loadWeight * mechanicalFactor * 100) / 100;
  const percent = Math.floor((effectiveLoad / (bodyWeight * weightMultiplier)) * 100);
  const adjustedPercent = percent - 2 * strengthBonus;
  const band = FEAT_OF_STRENGTH_BANDS.find(each => adjustedPercent <= each.maxPercent);
  return {
    loadWeight,
    mechanicalFactor,
    effectiveLoad,
    bodyWeight,
    weightMultiplier,
    strengthBonus,
    percent,
    adjustedPercent,
    difficulty: band?.difficulty ?? 'ni',
    beyondTable: !band,
  };
};

/** A `feat-of-strength` maneuver rolls Weight Training. */
export const validateFeatOfStrength = (skillId: string): void => {
  if (skillId !== WEIGHT_TRAINING_SKILL_ID) {
    throw new ValidationError('A feat of strength rolls Weight Training', 'err-feat-of-strength-invalid', { reason: 'skill', skillId });
  }
};
