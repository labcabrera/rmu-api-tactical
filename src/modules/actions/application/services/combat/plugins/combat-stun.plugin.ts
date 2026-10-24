import { isPreparing, rollModifiers, targetHasStatus } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

export const CombatStunPlugin: CombatPlugin = {
  id: 'stunned-target',
  group: 'defense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && (targetHasStatus(ctx, 'stunned') || !!ctx.attack?.modifiers.stunnedFoe),
        apply: ctx => void rollModifiers(ctx).add('stunned-target', 20),
      },
    ],
  },
};
