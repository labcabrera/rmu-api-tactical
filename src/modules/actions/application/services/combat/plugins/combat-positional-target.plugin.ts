import { PositionalTarget } from '../../../../domain/value-objects/action-attack-modifiers.vo';
import { CombatModifierBag } from '../combat-modifier-bag';
import { CombatPlugin } from '../combat-plugin';

const positionalTargetModifiers: Record<PositionalTarget, number> = {
  none: 0,
  flank: 15,
  rear: 35,
};

export const CombatPositionalTargetPlugin: CombatPlugin = {
  id: 'combat-positional-target',
  name: 'Combat Positional Target Plugin',
  version: '1.0.0',
  hooks: {
    prepare: [
      {
        apply: ctx => {
          const positionalTarget = ctx.attackPreparation?.modifiers.situationalModifiers.positionalTarget;
          if (!positionalTarget || positionalTarget === 'none') {
            return ctx;
          }

          const modifier = positionalTargetModifiers[positionalTarget] || 0;
          CombatModifierBag.from(ctx.attackPreparation!.modifiers.rollModifiers).add('positional-target', modifier);
          return ctx;
        },
      },
    ],
  },
};
