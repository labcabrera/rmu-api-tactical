import { isPreparing, preparation, rollModifiers } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

export const CombatHigherGroundPlugin: CombatPlugin = {
  id: 'higher-ground',
  group: 'situation',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && preparation(ctx).situationalModifiers.higherGround,
        apply: ctx => void rollModifiers(ctx).add('higher-ground', 10),
      },
    ],
  },
};
