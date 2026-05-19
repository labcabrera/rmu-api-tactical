import { CombatModifierBag } from '../combat-modifier-bag';
import { CombatPlugin } from '../combat-plugin';

export const CombatStunPlugin: CombatPlugin = {
  id: 'combat-stun',
  name: 'Combat Stun Plugin',
  version: '1.0.0',
  hooks: {
    prepare: [
      {
        apply: ctx => {
          const targetStatus = ctx.attackPreparation?.modifiers.situationalModifiers.targetStatus || [];
          if (!targetStatus.includes('stunned') || targetStatus.includes('surprised')) {
            return ctx;
          }

          CombatModifierBag.from(ctx.attackPreparation!.modifiers.rollModifiers).add('stunned-foe', 20);
          return ctx;
        },
      },
    ],
  },
};
