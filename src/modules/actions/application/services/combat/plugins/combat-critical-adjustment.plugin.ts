import { criticalModifiers, isPreparing, sourceSkillRanks } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

/**
 * Modifiers of the critical roll (§9.8). While preparing, an ambush adds the attacker's Ambush ranks; when a critical
 * is rolled, every critical modifier of the attack (ambush, absolute hit) is added to the roll.
 */
export const CombatCriticalAdjustmentPlugin: CombatPlugin = {
  id: 'critical-adjustment',
  group: 'critical',
  rule: '§9.8',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && !!ctx.attack?.modifiers.ambush,
        apply: ctx => void criticalModifiers(ctx).add('ambush', sourceSkillRanks(ctx, 'ambush')),
      },
    ],
    criticalRoll: [
      {
        condition: ctx => ctx.criticalRoll !== undefined,
        apply: ctx => {
          ctx.criticalRoll = ctx.criticalRoll! + criticalModifiers(ctx).sum();
        },
      },
    ],
  },
};
