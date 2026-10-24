import type { PositionalSource } from '../../../../domain/value-objects/action-attack-modifiers.vo.js';
import { isMelee, isPreparing, preparation, rollModifiers, sourceSkill } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

const positionalSourceModifiers: Record<PositionalSource, number> = {
  none: 0,
  to_flank: -30,
  to_rear: -70,
};

export const CombatPositionalSourcePlugin: CombatPlugin = {
  id: 'positional-source',
  group: 'situation',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && isMelee(ctx) && preparation(ctx).situationalModifiers.positionalSource !== 'none',
        apply: ctx => {
          const penalty = positionalSourceModifiers[preparation(ctx).situationalModifiers.positionalSource] || 0;
          rollModifiers(ctx).addWithSkill('positional-source', penalty, sourceSkill(ctx, 'reverse-strike'));
        },
      },
    ],
  },
};
