import { isMelee, isPreparing, rollModifiers, sourceHasStatus } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

export const CombatRangeInMeleePlugin: CombatPlugin = {
  id: 'range-in-melee',
  group: 'offense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && !isMelee(ctx) && (sourceHasStatus(ctx, 'melee') || !!ctx.attack?.modifiers.attackerInMelee),
        apply: ctx => void rollModifiers(ctx).add('range-in-melee', -20),
      },
    ],
  },
};
