import { Inject, Injectable, Optional } from '@nestjs/common';
import type { CombatHook, CombatHookName } from '../combat-hooks';
import { CombatPlugin } from '../combat-plugin';
import type { CombatPluginProvider } from './combat-plugin.tokens';
import { COMBAT_PLUGINS } from './combat-plugin.tokens';

@Injectable()
export class CombatPluginRegistryService {
  private readonly plugins = new Map<string, CombatPlugin>();

  constructor(@Optional() @Inject(COMBAT_PLUGINS) plugins: CombatPluginProvider = []) {
    plugins.forEach(plugin => this.register(plugin));
  }

  register(plugin: CombatPlugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  getPlugins(): CombatPlugin[] {
    return Array.from(this.plugins.values());
  }

  getHooks(hookName: CombatHookName): Array<CombatHook & { plugin: CombatPlugin }> {
    return this.getPlugins()
      .flatMap(plugin => (plugin.hooks[hookName] || []).map(hook => ({ ...hook, plugin })))
      .sort((left, right) => (right.priority || 0) - (left.priority || 0));
  }
}
