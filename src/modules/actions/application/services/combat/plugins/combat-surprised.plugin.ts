import { CombatModifierBag } from '../combat-modifier-bag';
import { CombatPlugin } from '../combat-plugin';

export const CombatSurprisedPlugin: CombatPlugin = {
  id: 'combat-surprised',
  name: 'Combat Surprised Plugin',
  version: '1.0.0',
  hooks: {
    prepare: [
      {
        apply: ctx => {
          const targetStatus = ctx.attackPreparation?.modifiers.situationalModifiers.targetStatus || [];
          if (!targetStatus.includes('surprised')) {
            return ctx;
          }

          CombatModifierBag.from(ctx.attackPreparation!.modifiers.rollModifiers).add('surprised-foe', 25);
          return ctx;
        },
      },
    ],
  },
};
