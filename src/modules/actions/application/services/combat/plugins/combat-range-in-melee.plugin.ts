import { isMelee, isPreparing, rollModifiers, sourceHasStatus } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

export const CombatRangeInMeleePlugin: CombatPlugin = {
  id: 'range-in-melee',
  group: 'offense',
  rule: 'Table 9-5',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && !isMelee(ctx) && (sourceHasStatus(ctx, 'melee') || !!ctx.attack?.modifiers.attackerInMelee),
        apply: ctx => void rollModifiers(ctx).add('range-in-melee', -20),
      },
    ],
  },
};
