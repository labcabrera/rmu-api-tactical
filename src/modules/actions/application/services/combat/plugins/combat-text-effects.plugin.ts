import { BLINDED, BLINDED_MODIFIER } from '../../../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { isPreparing, rollModifiers, sourceHasStatus } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

/**
 * Workspace spec 034: OB modifiers of the effects the critical and fumble texts give the attacker. `attack_penalty`
 * adds its penalties; `blinded` fights in pitch black (-100, ch. 15 Darkness and Blindness).
 */
export const CombatTextEffectsPlugin: CombatPlugin = {
  id: 'text-effects',
  group: 'offense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && (ctx.sourceActor?.getAttackPenalty?.() ?? 0) < 0,
        apply: ctx => void rollModifiers(ctx).add('attack-penalty', ctx.sourceActor!.getAttackPenalty()),
      },
      {
        condition: ctx => isPreparing(ctx) && sourceHasStatus(ctx, BLINDED),
        apply: ctx => void rollModifiers(ctx).add('blinded', BLINDED_MODIFIER),
      },
    ],
  },
};
