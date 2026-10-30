import { isPreparing, preparation, rollModifiers } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

export const CombatOffensiveBonusPlugin: CombatPlugin = {
  id: 'offensive-bonus',
  group: 'offense',
  rule: '§9.5',
  hooks: {
    prepare: [
      {
        condition: isPreparing,
        apply: ctx => void rollModifiers(ctx).add('bo', preparation(ctx).bo),
      },
    ],
  },
};
