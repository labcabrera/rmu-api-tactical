import { KeyValueModifier } from '../../../../domain/value-objects/key-value-modifier.vo';
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
            ctx.attackPreparation.modifiers.rollModifiers.push(new KeyValueModifier('sizeDifferenceDB', -(sizeDifference * 5)));
          }
          ctx.attackPreparation.criticalAdjustment = (ctx.attackPreparation.criticalAdjustment || 0) + sizeDifference;

          return ctx;
        },
      },
    ],
  },
};
