import { isPreparing, preparation, rollModifiers } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

export const CombatCustomBonusPlugin: CombatPlugin = {
  id: 'custom-bonus',
  group: 'situation',
  hooks: {
    prepare: [
      {
        condition: isPreparing,
        apply: ctx => void rollModifiers(ctx).add('custom-bonus', preparation(ctx).customBonus),
      },
    ],
  },
};
