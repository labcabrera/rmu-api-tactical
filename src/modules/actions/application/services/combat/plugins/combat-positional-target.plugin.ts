import type { PositionalTarget } from '../../../../domain/value-objects/action-attack-modifiers.vo.js';
import { isMelee, isPreparing, preparation, rollModifiers, targetIsFlatfooted } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

const positionalTargetModifiers: Record<PositionalTarget, number> = {
  none: 0,
  flank: 15,
  rear: 35,
};

/** Flank and rear bonuses in melee. Against a flatfooted target the `flatfooted-target` plugin gives the rear bonus. */
export const CombatPositionalTargetPlugin: CombatPlugin = {
  id: 'positional-target',
  group: 'situation',
  hooks: {
    prepare: [
      {
        condition: ctx =>
          isPreparing(ctx) && isMelee(ctx) && preparation(ctx).situationalModifiers.positionalTarget !== 'none' && !targetIsFlatfooted(ctx),
        apply: ctx =>
          void rollModifiers(ctx).add(
            'positional-target',
            positionalTargetModifiers[preparation(ctx).situationalModifiers.positionalTarget] || 0,
          ),
      },
    ],
  },
};
