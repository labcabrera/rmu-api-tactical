import type { CombatContext } from './combat-context.js';

/**
 * Phases of an attack, in order. `prepare` builds the roll modifiers, `parry` adds the declared parry,
 * `beforeAttackRoll`/`afterAttackRoll` resolve the roll against the tables, and `criticalRoll`/`fumbleRoll`
 * adjust and resolve each critical and the fumble.
 */
export type CombatPhase = 'prepare' | 'parry' | 'beforeAttackRoll' | 'afterAttackRoll' | 'criticalRoll' | 'fumbleRoll';

/** Phase run when the parries are declared (named so that callers do not spell a modifier key). */
export const PARRY_PHASE: CombatPhase = 'parry';

export interface CombatHook<TContext extends CombatContext = CombatContext> {
  /** Higher runs first; hooks with the same priority run in registration order. */
  priority?: number;
  /** When the rule applies. Guards belong here so that apply() only computes. */
  condition?: (ctx: TContext) => boolean | Promise<boolean>;
  apply: (ctx: TContext) => TContext | void | Promise<TContext | void>;
}

export type CombatPhaseHooks<TContext extends CombatContext = CombatContext> = Partial<Record<CombatPhase, CombatHook<TContext>[]>>;
