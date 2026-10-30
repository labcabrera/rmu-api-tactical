import type { CombatPlugin } from '../combat-plugin.js';

const BREAKAGE_ROLLS = new Set([33, 77]);

export const CombatBreakagePlugin: CombatPlugin = {
  id: 'breakage',
  group: 'resolution',
  rule: '§9.8',
  hooks: {
    beforeAttackRoll: [
      {
        condition: ctx => !!ctx.attack?.calculated && BREAKAGE_ROLLS.has(ctx.attackRoll || 0),
        apply: ctx => {
          ctx.attack!.calculated!.breakageRoll = true;
        },
      },
    ],
  },
};
