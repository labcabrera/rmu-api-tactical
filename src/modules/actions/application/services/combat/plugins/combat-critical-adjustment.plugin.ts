import { criticalModifiers } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

/** Adds the attack's critical modifiers (size difference, absolute hit) to the critical roll. */
export const CombatCriticalAdjustmentPlugin: CombatPlugin = {
  id: 'critical-adjustment',
  group: 'critical',
  hooks: {
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
