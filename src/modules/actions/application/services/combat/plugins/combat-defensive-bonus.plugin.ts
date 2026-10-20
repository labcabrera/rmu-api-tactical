import { isPreparing, preparation, rollModifiers, targetIsFlatfooted } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

/** The target's DB. A flatfooted target has no Quickness DB (§9.5 Surprised or Flatfooted). */
export const CombatDefensiveBonusPlugin: CombatPlugin = {
  id: 'defensive-bonus',
  group: 'defense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && !preparation(ctx).situationalModifiers.disabledDB && !targetIsFlatfooted(ctx),
        apply: ctx => void rollModifiers(ctx).add('bd', -preparation(ctx).bd),
      },
    ],
  },
};
