import { CombatModifierBag } from '../combat-modifier-bag';
import { CombatPlugin } from '../combat-plugin';

export const CombatHigherGroundPlugin: CombatPlugin = {
  id: 'combat-higher-ground',
  name: 'Combat Higher Ground Plugin',
  version: '1.0.0',
  hooks: {
    prepare: [
      {
        apply: ctx => {
          if (!ctx.attackPreparation?.modifiers.situationalModifiers.higherGround) return ctx;
          CombatModifierBag.from(ctx.attackPreparation.modifiers.rollModifiers).add('higher-ground', 10);
          return ctx;
        },
      },
    ],
  },
};
