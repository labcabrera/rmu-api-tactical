import { CombatContext } from './combat-context';
import { CombatHooks } from './combat-hooks';

export type CombatPluginTarget = 'talent' | 'skill' | 'feature' | 'item' | 'rule' | 'system';

export interface CombatPlugin<TContext extends CombatContext = CombatContext> {
  id: string;
  name: string;
  version: string;
  appliesTo: CombatPluginTarget;
  hooks: CombatHooks<TContext>;
}
