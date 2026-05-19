import { RestrictedQuarters } from '../../../../domain/value-objects/action-attack-modifiers.vo';
import { CombatModifierBag } from '../combat-modifier-bag';
import { CombatPlugin } from '../combat-plugin';

const restrictedQuartersModifiers: Record<RestrictedQuarters, number> = {
  none: 0,
  close: -25,
  cramped: -50,
  tight: -75,
  confined: -100,
};

export const CombatRestrictedQuartersPlugin: CombatPlugin = {
  id: 'combat-restricted-quarters',
  name: 'Combat Restricted Quarters Plugin',
  version: '1.0.0',
  hooks: {
    prepare: [
      {
        apply: ctx => {
          const restrictedQuarters = ctx.attackPreparation?.modifiers.situationalModifiers.restrictedQuarters;
          if (!restrictedQuarters || restrictedQuarters === 'none') {
            return ctx;
          }
          const modifier = restrictedQuartersModifiers[restrictedQuarters] || 0;
          if (modifier !== 0) {
            CombatModifierBag.from(ctx.attackPreparation!.modifiers.rollModifiers).add('restricted-quarters', modifier);
          }
          return ctx;
        },
      },
    ],
  },
};
