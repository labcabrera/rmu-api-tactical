import { CombatPlugin } from '../combat-plugin';

const BREAKAGE_ROLLS = new Set([33, 77]);

export const CombatBreakagePlugin: CombatPlugin = {
  id: 'breakage',
  group: 'resolution',
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
