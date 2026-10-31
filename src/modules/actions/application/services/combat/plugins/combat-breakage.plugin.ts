import type { CombatContext } from '../combat-context.js';
import type { CombatPlugin } from '../combat-plugin.js';

const BREAKAGE_ROLLS = new Set([33, 77]);

/**
 * Core Law 6.1: a die showing 33 or 77, also one of the extra dice of an open-ended roll, calls for a breakage check.
 * Without the dice, only the first one (the unmodified roll, or the total) is known (spec 056).
 */
const dice = (ctx: CombatContext): number[] => (ctx.attackDice?.length ? ctx.attackDice : [ctx.unmodifiedRoll ?? ctx.attackRoll ?? 0]);

export const CombatBreakagePlugin: CombatPlugin = {
  id: 'breakage',
  group: 'resolution',
  rule: '§9.8',
  hooks: {
    beforeAttackRoll: [
      {
        condition: ctx => !!ctx.attack?.calculated && dice(ctx).some(die => BREAKAGE_ROLLS.has(die)),
        apply: ctx => {
          ctx.attack!.calculated!.breakageRoll = true;
        },
      },
    ],
  },
};
