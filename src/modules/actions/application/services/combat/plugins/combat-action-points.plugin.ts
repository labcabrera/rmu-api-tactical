import { isMelee, isPreparing, preparation, rollModifiers } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

const ACTION_POINT_PENALTY = -25;
const MELEE_ACTION_POINTS = 4;
const RANGED_ACTION_POINTS = 3;

export const CombatActionPointsPlugin: CombatPlugin = {
  id: 'action-points',
  group: 'offense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && !ctx.action.freeAction,
        apply: ctx => {
          const required = isMelee(ctx) ? MELEE_ACTION_POINTS : RANGED_ACTION_POINTS;
          // Clamped at 0: spending more points than required gives no bonus (Python allowed it).
          const missing = Math.max(required - preparation(ctx).actionPoints, 0);
          rollModifiers(ctx).add('action-points', missing * ACTION_POINT_PENALTY);
        },
      },
    ],
  },
};
