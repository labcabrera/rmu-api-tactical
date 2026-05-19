import { Inject, Injectable, Optional } from '@nestjs/common';
import type { CombatHook, CombatPhase } from '../combat-phase';
import { CombatPlugin } from '../combat-plugin';
import type { CombatPluginProvider } from './combat-plugin.tokens';
import { COMBAT_PLUGINS } from './combat-plugin.tokens';

@Injectable()
export class CombatPluginRegistryService {
  private readonly plugins = new Map<string, CombatPlugin>();
  private readonly order = new Map<string, number>();
  private sequence = 0;

  constructor(@Optional() @Inject(COMBAT_PLUGINS) plugins: CombatPluginProvider = []) {
    plugins.forEach(plugin => this.register(plugin));
  }

  register(plugin: CombatPlugin): void {
    if (!this.order.has(plugin.id)) {
      this.order.set(plugin.id, this.sequence++);
    }
    this.plugins.set(plugin.id, plugin);
  }

  getPlugins(): CombatPlugin[] {
    return Array.from(this.plugins.values());
  }

  getPhaseHooks(phase: CombatPhase): Array<CombatHook & { plugin: CombatPlugin }> {
    return this.getPlugins()
      .flatMap(plugin => (plugin.hooks[phase] || []).map(hook => ({ ...hook, plugin })))
      .sort((left, right) => {
        const priority = (right.priority || 0) - (left.priority || 0);
        if (priority !== 0) {
          return priority;
        }
        return (this.order.get(left.plugin.id) || 0) - (this.order.get(right.plugin.id) || 0);
      });
  }
}
