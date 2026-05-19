import { CombatContext } from './combat-context';

export type CombatPhase = 'prepare' | 'attackRoll' | 'criticalRoll' | 'fumbleRoll';

export interface CombatHook<TContext extends CombatContext = CombatContext> {
  priority?: number;
  condition?: (ctx: TContext) => boolean | Promise<boolean>;
  apply: (ctx: TContext) => TContext | Promise<TContext>;
}

export type CombatPhaseHooks<TContext extends CombatContext = CombatContext> = Partial<Record<CombatPhase, CombatHook<TContext>[]>>;
