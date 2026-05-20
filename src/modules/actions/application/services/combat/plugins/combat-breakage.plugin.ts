import { CombatPlugin } from '../combat-plugin';

const BREAKAGE_ROLLS = new Set([33, 77]);

export const CombatBreakagePlugin: CombatPlugin = {
  id: 'combat-breakage',
  name: 'Combat Breakage Plugin',
  version: '1.0.0',
  hooks: {
    attackRoll: [
      {
        apply: ctx => {
          if (!ctx.attack?.calculated || !BREAKAGE_ROLLS.has(ctx.attackRoll || 0)) {
            return ctx;
          }

          ctx.attack.calculated.breakageRoll = true;
          return ctx;
        },
      },
    ],
  },
};
