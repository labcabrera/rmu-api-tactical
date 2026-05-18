import { CombatContext } from './combat-context';

export type CombatHookName =
  | 'combat.beforeResolve'
  | 'combat.beforePrepare'
  | 'combat.afterPrepare'
  | 'combat.beforeAttackRoll'
  | 'combat.afterAttackRoll'
  | 'combat.beforeTableLookup'
  | 'combat.afterTableLookup'
  | 'combat.beforeDamage'
  | 'combat.afterDamage'
  | 'combat.beforeCritical'
  | 'combat.afterCritical'
  | 'combat.beforeFumble'
  | 'combat.afterFumble'
  | 'combat.beforeApply'
  | 'combat.afterApply'
  | 'combat.finalize';

export interface CombatHook<TContext extends CombatContext = CombatContext> {
  priority?: number;
  condition?: (ctx: TContext) => boolean | Promise<boolean>;
  apply: (ctx: TContext) => TContext | Promise<TContext>;
}

export type CombatHooks<TContext extends CombatContext = CombatContext> = Partial<Record<CombatHookName, CombatHook<TContext>[]>>;
