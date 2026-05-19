import { PositionalSource } from '../../../../domain/value-objects/action-attack-modifiers.vo';
import { CombatModifierBag } from '../combat-modifier-bag';
import { CombatPlugin } from '../combat-plugin';

const positionalSourceModifiers: Record<PositionalSource, number> = {
  none: 0,
  to_flank: -30,
  to_rear: -70,
};

export const CombatPositionalSourcePlugin: CombatPlugin = {
  id: 'combat-positional-source',
  name: 'Combat Positional Source Plugin',
  version: '1.0.0',
  hooks: {
    prepare: [
      {
        apply: ctx => {
          const positionalSource = ctx.attackPreparation?.modifiers.situationalModifiers.positionalSource;
          if (!positionalSource || positionalSource === 'none') {
            return ctx;
          }
          const modifier = positionalSourceModifiers[positionalSource] || 0;
          if (modifier !== 0) {
            CombatModifierBag.from(ctx.attackPreparation!.modifiers.rollModifiers).add('positional-source', modifier);
          }
          return ctx;
        },
      },
    ],
  },
};
