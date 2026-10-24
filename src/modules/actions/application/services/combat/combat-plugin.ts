import type { ModifierGroup } from '../../../domain/value-objects/key-value-modifier.vo.js';
import type { CombatContext } from './combat-context.js';
import type { CombatPhaseHooks } from './combat-phase.js';

/**
 * One rule of the attack calculation. A plugin reads the combat context and contributes modifiers or results in
 * one or more phases; adding a rule means writing a plugin and registering it in COMBAT_PLUGIN_LIST, without
 * touching the handlers or the resolver.
 */
export interface CombatPlugin<TContext extends CombatContext = CombatContext> {
  /** Kebab-case id: the source of the modifiers it adds and, unless it says otherwise, their key. */
  id: string;
  /** Breakdown group of the modifiers it adds. */
  group: ModifierGroup;
  hooks: CombatPhaseHooks<TContext>;
}
