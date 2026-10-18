import { isPreparing, rollModifiers, targetHasStatus } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

export const CombatSurprisedPlugin: CombatPlugin = {
  id: 'surprised-target',
  group: 'defense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && (targetHasStatus(ctx, 'surprised') || !!ctx.attack?.modifiers.surprisedFoe),
        apply: ctx => void rollModifiers(ctx).add('surprised-target', 25),
      },
    ],
  },
};
