import { ActionAttack } from '../../../../domain/value-objects/action-attack.vo';
import { CombatModifierBag } from '../combat-modifier-bag';
import { CombatPlugin } from '../combat-plugin';

export const CombatCalledShotPlugin: CombatPlugin = {
  id: 'combat-called-shot',
  name: 'Combat Called Shot Plugin',
  version: '1.0.0',
  hooks: {
    prepare: [
      {
        apply: ctx => {
          if (!ctx.attack || !ctx.attackPreparation || !ActionAttack.isCalledShot(ctx.attack)) {
            return ctx;
          }

          const penalty = ctx.attack.modifiers.calledShotPenalty || 0;
          CombatModifierBag.from(ctx.attackPreparation.modifiers.rollModifiers).add('called-shot', -penalty);
          return ctx;
        },
      },
    ],
  },
};
