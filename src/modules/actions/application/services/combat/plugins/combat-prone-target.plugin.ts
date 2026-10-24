import { isMelee, isPreparing, rollModifiers, targetHasStatus } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

export const CombatProneTargetPlugin: CombatPlugin = {
  id: 'prone-target',
  group: 'defense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && (targetHasStatus(ctx, 'prone') || !!ctx.attack?.modifiers.proneTarget),
        // Easier to hit in melee, harder for ranged and thrown attacks.
        apply: ctx => void rollModifiers(ctx).add('prone-target', isMelee(ctx) ? 30 : -30),
      },
    ],
  },
};
