import { isPreparing, preparation, rollModifiers, targetIgnoresDefense } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

/** The target's DB. A flatfooted target has no Quickness DB (§9.5 Surprised or Flatfooted), nor one in frenzy (spec 040). */
export const CombatDefensiveBonusPlugin: CombatPlugin = {
  id: 'defensive-bonus',
  group: 'defense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && !preparation(ctx).situationalModifiers.disabledDB && !targetIgnoresDefense(ctx),
        apply: ctx => void rollModifiers(ctx).add('bd', -preparation(ctx).bd),
      },
    ],
  },
};
