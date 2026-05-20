import { CombatModifierBag } from '../combat-modifier-bag';
import { CombatPlugin } from '../combat-plugin';

const ACTION_POINT_PENALTY = -25;
const REQUIRED_ACTION_POINTS: Record<string, number> = {
  melee: 4,
  ranged: 3,
  thrown: 3,
};

export const CombatActionPointsPlugin: CombatPlugin = {
  id: 'combat-action-points',
  name: 'Combat Action Points Plugin',
  version: '1.0.0',
  hooks: {
    prepare: [
      {
        apply: ctx => {
          if (!ctx.attackPreparation || ctx.action.freeAction) {
            return ctx;
          }

          const { attackType, actionPoints, rollModifiers } = ctx.attackPreparation.modifiers;
          const requiredActionPoints = REQUIRED_ACTION_POINTS[attackType] || 0;
          const missingActionPoints = Math.max(requiredActionPoints - actionPoints, 0);

          CombatModifierBag.from(rollModifiers).add('action-points', missingActionPoints * ACTION_POINT_PENALTY);
          return ctx;
        },
      },
    ],
  },
};
