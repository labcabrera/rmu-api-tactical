import { isPreparing, preparation, rollModifiers } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

export const CombatHigherGroundPlugin: CombatPlugin = {
  id: 'higher-ground',
  group: 'situation',
  rule: 'Table 9-5',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && preparation(ctx).situationalModifiers.higherGround,
        apply: ctx => void rollModifiers(ctx).add('higher-ground', 10),
      },
    ],
  },
};
