import { PositionalTarget } from '../../../../domain/value-objects/action-attack-modifiers.vo';
import { isMelee, isPreparing, preparation, rollModifiers } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

const positionalTargetModifiers: Record<PositionalTarget, number> = {
  none: 0,
  flank: 15,
  rear: 35,
};

export const CombatPositionalTargetPlugin: CombatPlugin = {
  id: 'positional-target',
  group: 'situation',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && isMelee(ctx) && preparation(ctx).situationalModifiers.positionalTarget !== 'none',
        apply: ctx =>
          void rollModifiers(ctx).add(
            'positional-target',
            positionalTargetModifiers[preparation(ctx).situationalModifiers.positionalTarget] || 0,
          ),
      },
    ],
  },
};
