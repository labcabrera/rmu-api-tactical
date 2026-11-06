import { NON_VIOLENT } from '../../../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import type { CombatContext } from '../combat-context.js';
import { isPreparing, rollModifiers } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

const nonViolent = (ctx: CombatContext) => ctx.sourceActor?.effects?.find(effect => effect.status === NON_VIOLENT);

/**
 * Non-Violent (Character Companion, workspace spec 039): once the actor has inflicted a critical, its offensive actions
 * are at -5/Tier for the rest of the combat. The effect is created when the attacks are applied.
 *
 * Workspace spec 079, D1 (decision ★): Core Law ch. 4 reads differently (-20/Tier to any action, only in the round after
 * the critical); the Companion version is kept on purpose, as the later and more detailed of the two.
 */
export const CombatNonViolentPlugin: CombatPlugin = {
  id: 'non-violent',
  group: 'offense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && !!nonViolent(ctx)?.value,
        apply: ctx => void rollModifiers(ctx).add('non-violent', nonViolent(ctx)!.value || 0),
      },
    ],
  },
};
