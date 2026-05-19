import { CombatPlugin } from '../combat-plugin';

const restrictedQuartersModifiers: Record<string, number> = {
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
          ctx.attackPreparation!.modifiers.rollModifiers.restrictedQuarters = restrictedQuartersModifiers[restrictedQuarters] || 0;
          return ctx;
        },
      },
    ],
  },
};
