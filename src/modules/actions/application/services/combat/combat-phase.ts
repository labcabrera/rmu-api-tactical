import type { ModifierParams } from '../../../domain/value-objects/key-value-modifier.vo.js';
import type { CombatContext } from './combat-context.js';

/**
 * Phases of an attack, in order. `prepare` builds the roll modifiers, `parry` adds the declared parry,
 * `beforeAttackRoll`/`afterAttackRoll` resolve the roll against the tables, and `criticalRoll`/`fumbleRoll`
 * adjust and resolve each critical and the fumble.
 */
export type CombatPhase = 'prepare' | 'parry' | 'beforeAttackRoll' | 'afterAttackRoll' | 'criticalRoll' | 'fumbleRoll';

/** Phase run when the parries are declared (named so that callers do not spell a modifier key). */
export const PARRY_PHASE: CombatPhase = 'parry';

/**
 * A rule that does not apply for a reason the player could miss (the target has a shield, but the attack comes from
 * its flank): a hook's condition returns it instead of `false`, and the attack keeps it to explain (spec 051).
 */
export interface CombatSkip {
  skip: string;
  params?: ModifierParams;
}

export const skip = (reason: string, params?: ModifierParams): CombatSkip => ({ skip: reason, ...(params ? { params } : {}) });

export interface CombatHook<TContext extends CombatContext = CombatContext> {
  /** Higher runs first; hooks with the same priority run in registration order. */
  priority?: number;
  /**
   * When the rule applies. Guards belong here so that apply() only computes. A `skip()` instead of `false` records
   * why it does not.
   */
  condition?: (ctx: TContext) => boolean | CombatSkip | Promise<boolean | CombatSkip>;
  apply: (ctx: TContext) => TContext | void | Promise<TContext | void>;
}

export type CombatPhaseHooks<TContext extends CombatContext = CombatContext> = Partial<Record<CombatPhase, CombatHook<TContext>[]>>;
