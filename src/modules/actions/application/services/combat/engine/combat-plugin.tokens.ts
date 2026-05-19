import { CombatPlugin } from '../combat-plugin';

export const COMBAT_PLUGINS = Symbol('COMBAT_PLUGINS');

export type CombatPluginProvider = CombatPlugin[];
