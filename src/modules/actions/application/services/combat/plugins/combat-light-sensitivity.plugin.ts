import { LIGHT_SENSITIVITY } from '../../../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { lightSensitivityPenalty } from '../../../../domain/value-objects/light-type.vo.js';
import type { CombatContext } from '../combat-context.js';
import { isPreparing, rollModifiers, sourceTraitTier } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

const penalty = (ctx: CombatContext): number => lightSensitivityPenalty(ctx.light, sourceTraitTier(ctx, LIGHT_SENSITIVITY));

/**
 * Light Sensitivity of the attacker (§4.5, workspace spec 076, §3.3): -25 per tier in bright light, 25, 50 and 75 less
 * in the next three levels, with the ambient light of the tactical game. A game without ambient light applies nothing.
 */
export const CombatLightSensitivityPlugin: CombatPlugin = {
  id: 'light-sensitivity',
  group: 'offense',
  rule: '§4.5',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && penalty(ctx) < 0,
        apply: ctx =>
          void rollModifiers(ctx).add('light-sensitivity', penalty(ctx), {
            light: ctx.light!,
            tier: sourceTraitTier(ctx, LIGHT_SENSITIVITY),
          }),
      },
    ],
  },
};
