import { CombatModifierBag } from '../combat-modifier-bag';
import { CombatPlugin } from '../combat-plugin';

export const CombatSizeDifferencePlugin: CombatPlugin = {
  id: 'combat-size-difference',
  name: 'Combat Size Difference Plugin',
  version: '1.0.0',
  hooks: {
    prepare: [
      {
        apply: ctx => {
          const sizeDifference = ctx.attackPreparation?.modifiers.situationalModifiers.sizeDifference || 0;
          if (!ctx.attackPreparation || sizeDifference === 0) {
            return ctx;
          }

          if (sizeDifference > 0) {
            CombatModifierBag.from(ctx.attackPreparation.modifiers.rollModifiers).add('sizeDifferenceDB', -(sizeDifference * 5));
          }
          CombatModifierBag.from(ctx.attackPreparation.modifiers.criticalModifiers).add('sizeDifference', sizeDifference);

          return ctx;
        },
      },
    ],
  },
};
