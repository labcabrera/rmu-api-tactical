import { isPreparing, preparation, rollModifiers } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

export const CombatDefensiveBonusPlugin: CombatPlugin = {
  id: 'defensive-bonus',
  group: 'defense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && !preparation(ctx).situationalModifiers.disabledDB,
        apply: ctx => void rollModifiers(ctx).add('bd', -preparation(ctx).bd),
      },
    ],
  },
};
