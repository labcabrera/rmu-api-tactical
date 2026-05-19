import { CombatModifierBag } from '../combat-modifier-bag';
import { CombatPlugin } from '../combat-plugin';

export const CombatPronePlugin: CombatPlugin = {
  id: 'combat-prone',
  name: 'Combat Prone Plugin',
  version: '1.0.0',
  hooks: {
    prepare: [
      {
        apply: ctx => {
          if (!ctx.attackPreparation) {
            return ctx;
          }

          const modifiers = CombatModifierBag.from(ctx.attackPreparation.modifiers.rollModifiers);
          const { sourceStatus, targetStatus } = ctx.attackPreparation.modifiers.situationalModifiers;

          if (sourceStatus.includes('prone')) {
            modifiers.add('prone-source', -50);
          }

          if (targetStatus.includes('prone')) {
            modifiers.add('prone-target', ctx.attackPreparation.modifiers.attackType === 'ranged' ? -30 : 30);
          }

          return ctx;
        },
      },
    ],
  },
};
