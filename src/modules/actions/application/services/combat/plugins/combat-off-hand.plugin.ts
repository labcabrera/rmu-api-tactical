import { KeyValueModifier } from '../../../../domain/value-objects/key-value-modifier.vo';
import { CombatPlugin } from '../combat-plugin';

const AMBIDEXTROUS_TRAIT_ID = 'ambidextrous';

export const CombatOffHandPlugin: CombatPlugin = {
  id: 'combat-off-hand',
  name: 'Combat Off-Hand Plugin',
  version: '1.0.0',
  hooks: {
    prepare: [
      {
        apply: ctx => {
          const offHand = ctx.attackPreparation?.modifiers.situationalModifiers.offHand;
          const ambidextrous = ctx.sourceTraits?.some(trait => trait.id === AMBIDEXTROUS_TRAIT_ID) || false;
          if (!offHand || ambidextrous) {
            return ctx;
          }

          ctx.attackPreparation!.modifiers.rollModifiers.push(new KeyValueModifier('offHand', -20));
          return ctx;
        },
      },
    ],
  },
};
