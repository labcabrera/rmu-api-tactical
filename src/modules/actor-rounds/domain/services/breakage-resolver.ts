import { ValidationError } from '../../../shared/domain/errors/errors.js';

/** Result of a breakage check (§6.1, Table 6-1). */
export type BreakageResult = 'absolute-failure' | 'failure' | 'partial-success' | 'success' | 'absolute-success';

export interface BreakageModifier {
  key: string;
  value: number;
  /** Rule reference of the entry (workspace spec 052). */
  rule?: string;
}

export interface BreakageCheckInput {
  /** The open-ended roll. */
  roll: number;
  /** The unmodified roll, when it is not `roll` (an unmodified 66 is an unusual event). */
  unmodifiedRoll?: number;
  modifiers: BreakageModifier[];
}

export interface BreakageOutcome {
  total: number;
  result: BreakageResult;
  unmodified66: boolean;
  /** Damage to the item: negative (or a repair, positive, on an unusual success). 0: none. */
  damage: number;
  broken: boolean;
  /** The damage does not last after the game (unusual event on a failure). */
  temporary: boolean;
}

/** Most of the earlier damage an unusual event on a success repairs. */
const UNUSUAL_REPAIR = 10;

/**
 * Resolves a breakage check (spec 019, decisions 4 and 5): the total is the roll plus every modifier, and its result
 * is the row of Table 6-1. An unmodified 66 keeps the result of the total, but its damage is temporary and, with no
 * damage, it repairs up to 10 of the earlier damage (`previousDamage`, 0 or negative).
 */
export const BreakageResolver = {
  resolve(input: BreakageCheckInput, previousDamage = 0): BreakageOutcome {
    if (typeof input.roll !== 'number' || !Number.isFinite(input.roll)) {
      throw new ValidationError('Required roll value', 'err-breakage-roll-required');
    }
    const total = input.roll + input.modifiers.reduce((sum, modifier) => sum + (modifier.value || 0), 0);
    const result = BreakageResolver.resultOf(total);
    const unmodified66 = (input.unmodifiedRoll ?? input.roll) === 66;
    const base = BreakageResolver.damageOf(result);
    if (!unmodified66) {
      return { total, result, unmodified66, damage: base.damage, broken: base.broken, temporary: false };
    }
    if (base.damage < 0 || base.broken) {
      return { total, result, unmodified66, damage: base.damage, broken: base.broken, temporary: true };
    }
    const repair = Math.min(UNUSUAL_REPAIR, Math.max(0, -previousDamage));
    return { total, result, unmodified66, damage: repair, broken: false, temporary: false };
  },

  resultOf(total: number): BreakageResult {
    if (total < 1) return 'absolute-failure';
    if (total <= 75) return 'failure';
    if (total <= 100) return 'partial-success';
    if (total <= 175) return 'success';
    return 'absolute-success';
  },

  damageOf(result: BreakageResult): { damage: number; broken: boolean } {
    switch (result) {
      case 'absolute-failure':
        return { damage: 0, broken: true };
      case 'failure':
        return { damage: -20, broken: false };
      case 'partial-success':
        return { damage: -10, broken: false };
      default:
        return { damage: 0, broken: false };
    }
  },
};
