import { precisionEffectFor, precisionObPenalty } from '../../../../domain/services/precision.js';
import type { CombatContext } from '../combat-context.js';
import { criticalModifiers, isPreparing, rollModifiers } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

const precisionOf = (ctx: CombatContext) =>
  precisionEffectFor(ctx.sourceActor, ctx.attack?.type, ctx.attack?.modifiers.targetId, ctx.sourceAttack?.skillId);

/**
 * Precision (Character Companion, workspace spec 076, decision B9): the next melee attack against the foe of a
 * successful Precision maneuver, with the weapon of the talent, gives up the OB traded for the maneuver and adds half
 * the Ambush ranks to its critical roll (as a critical modifier, which the critical adjustment adds when the critical is
 * rolled). The effect is used up when the attack is applied.
 */
export const CombatPrecisionPlugin: CombatPlugin = {
  id: 'precision',
  group: 'critical',
  rule: 'Character Companion',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && !!precisionOf(ctx),
        apply: ctx => {
          const effect = precisionOf(ctx)!;
          rollModifiers(ctx).add('precision', -precisionObPenalty(effect));
          criticalModifiers(ctx).add('precision', Math.max(0, effect.value ?? 0));
        },
      },
    ],
  },
};
