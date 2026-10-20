import { isPreparing, rollModifiers, targetHasStatus, targetIsFlatfooted } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

/** Surprised target (§9.5). A flatfooted one gets the surprise bonus from the `flatfooted-target` plugin. */
export const CombatSurprisedPlugin: CombatPlugin = {
  id: 'surprised-target',
  group: 'defense',
  hooks: {
    prepare: [
      {
        condition: ctx =>
          isPreparing(ctx) && (targetHasStatus(ctx, 'surprised') || !!ctx.attack?.modifiers.surprisedFoe) && !targetIsFlatfooted(ctx),
        apply: ctx => void rollModifiers(ctx).add('surprised-target', 25),
      },
    ],
  },
};
