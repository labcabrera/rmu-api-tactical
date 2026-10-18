import { isPreparing, preparation, rollModifiers } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

const ROLL_PER_SIZE = 5;

/**
 * A larger attacker (with its charge) than the target finds it harder to hit: −5 per size. A smaller or equal
 * one gets nothing (the Python calculator's `size-bonus` instead penalised a smaller attacker). The effect on
 * damage and critical severity is applied with the attack's own size, in the `attack-size` plugin.
 */
export const CombatSizeDifferencePlugin: CombatPlugin = {
  id: 'size-difference',
  group: 'situation',
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
