import { CombatPlugin } from '../combat-plugin';

const positionalSourceModifiers: Record<string, number> = {
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
          ctx.attackPreparation!.modifiers.rollModifiers.positionalSource = positionalSourceModifiers[positionalSource] || 0;
          return ctx;
        },
      },
    ],
  },
};
