import { isPreparing, rollModifiers, targetHasStatus } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

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
