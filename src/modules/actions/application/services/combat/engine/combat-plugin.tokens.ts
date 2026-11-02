import type { CombatPlugin } from '../combat-plugin.js';

export const COMBAT_PLUGINS = Symbol('COMBAT_PLUGINS');

export type CombatPluginProvider = CombatPlugin[];
