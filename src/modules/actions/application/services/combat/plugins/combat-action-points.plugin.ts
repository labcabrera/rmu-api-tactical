import { ActionApProfile } from '../../../../domain/value-objects/action-ap-profile.vo.js';
import { isMelee, isPreparing, preparation, rollModifiers } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

/**
 * §8.1: -25 per AP below the maximum of the attack's AP profile (melee 2-4, ranged 1-3). An attack forced by an effect
 * (and a legacy free attack, read as forced with its full AP) takes none (spec 011, §6).
 */
export const CombatActionPointsPlugin: CombatPlugin = {
  id: 'action-points',
  group: 'offense',
  rule: '§8.1',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && ctx.action.takesApPenalty(),
        apply: ctx => {
          const profile = ActionApProfile.forAction(isMelee(ctx) ? 'melee_attack' : 'ranged_attack');
          // Clamped at 0: spending more points than the maximum gives no bonus.
          rollModifiers(ctx).add('action-points', profile.missing(preparation(ctx).actionPoints) * profile.penaltyPerMissing);
        },
      },
    ],
  },
};
