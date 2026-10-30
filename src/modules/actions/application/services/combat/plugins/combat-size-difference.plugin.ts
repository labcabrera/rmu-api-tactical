import { isPreparing, preparation, rollModifiers } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

const ROLL_PER_SIZE = 5;

/**
 * A target smaller than the attack gains +5 DB per size (§9.4), so −5 per size on the roll. The attack's size is the
 * one of the sheet, without the charge, which only moves the critical severity (`attack-size` plugin). A larger
 * target gets nothing.
 */
export const CombatSizeDifferencePlugin: CombatPlugin = {
  id: 'size-difference',
  group: 'situation',
  rule: '§9.4',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && (preparation(ctx).situationalModifiers.sizeDifference || 0) > 0,
        apply: ctx => {
          rollModifiers(ctx).add('size-difference', -preparation(ctx).situationalModifiers.sizeDifference * ROLL_PER_SIZE);
        },
      },
    ],
  },
};
