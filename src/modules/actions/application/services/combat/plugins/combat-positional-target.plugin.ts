import type { PositionalTarget } from '../../../../domain/value-objects/action-attack-modifiers.vo.js';
import { isMelee, isPreparing, preparation, rollModifiers, targetIsFlatfooted } from '../combat-modifiers.js';
import { skip } from '../combat-phase.js';
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
  rule: '§9.5',
  hooks: {
    prepare: [
      {
        condition: ctx => {
          if (!isPreparing(ctx)) return false;
          const position = preparation(ctx).situationalModifiers.positionalTarget;
          if (position === 'none') return false;
          if (!isMelee(ctx)) return skip('positional-melee-only', { position });
          return targetIsFlatfooted(ctx) ? skip('counted-by-flatfooted', { position }) : true;
        },
        apply: ctx => {
          const position = preparation(ctx).situationalModifiers.positionalTarget;
          rollModifiers(ctx).add('positional-target', positionalTargetModifiers[position] || 0, { position });
        },
      },
    ],
  },
};
