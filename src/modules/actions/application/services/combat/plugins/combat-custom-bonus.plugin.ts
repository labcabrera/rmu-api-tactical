import { isPreparing, preparation, rollModifiers } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

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
