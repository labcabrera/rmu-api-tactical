import type { RestrictedQuarters } from '../../../../domain/value-objects/action-attack-modifiers.vo.js';
import { isPreparing, preparation, rollModifiers, sourceSkill } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

const restrictedQuartersModifiers: Record<RestrictedQuarters, number> = {
  none: 0,
  close: -25,
  cramped: -50,
  tight: -75,
  confined: -100,
};

export const CombatRestrictedQuartersPlugin: CombatPlugin = {
  id: 'restricted-quarters',
  group: 'situation',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && preparation(ctx).situationalModifiers.restrictedQuarters !== 'none',
        apply: ctx => {
          const penalty = restrictedQuartersModifiers[preparation(ctx).situationalModifiers.restrictedQuarters] || 0;
          rollModifiers(ctx).addWithSkill('restricted-quarters', penalty, sourceSkill(ctx, 'restricted-quarters'));
        },
      },
    ],
  },
};
