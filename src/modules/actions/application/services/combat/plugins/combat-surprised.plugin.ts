import { isPreparing, rollModifiers, targetHasStatus, targetIsFlatfooted } from '../combat-modifiers.js';
import { skip } from '../combat-phase.js';
import type { CombatPlugin } from '../combat-plugin.js';

/** Surprised target (§9.5). A flatfooted one gets the surprise bonus from the `flatfooted-target` plugin. */
export const CombatSurprisedPlugin: CombatPlugin = {
  id: 'surprised-target',
  group: 'defense',
  rule: '§9.5',
  hooks: {
    prepare: [
      {
        condition: ctx => {
          if (!isPreparing(ctx) || !(targetHasStatus(ctx, 'surprised') || !!ctx.attack?.modifiers.surprisedFoe)) return false;
          return targetIsFlatfooted(ctx) ? skip('counted-by-flatfooted') : true;
        },
        apply: ctx => void rollModifiers(ctx).add('surprised-target', 25),
      },
    ],
  },
};
