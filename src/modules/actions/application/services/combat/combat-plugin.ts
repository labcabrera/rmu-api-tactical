import { CombatContext } from './combat-context';
import { CombatPhaseHooks } from './combat-phase';

export interface CombatPlugin<TContext extends CombatContext = CombatContext> {
  id: string;
  name: string;
  version: string;
  hooks: CombatPhaseHooks<TContext>;
}
