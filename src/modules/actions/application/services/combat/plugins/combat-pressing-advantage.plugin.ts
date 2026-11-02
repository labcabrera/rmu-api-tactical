import { PRESSING_ADVANTAGE } from '../../../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import type { CombatContext } from '../combat-context.js';
import { isPreparing, rollModifiers } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

/** The source's `pressing-advantage` effect against this attack's target, if this is its first attack on it. */
const pressingAdvantage = (ctx: CombatContext) => {
  const targetId = ctx.attack?.modifiers.targetId;
  if (!targetId || (ctx.earlierAttacks || []).some(attack => attack.modifiers.targetId === targetId)) {
    return undefined;
  }
  return ctx.sourceActor?.effects?.find(effect => effect.status === PRESSING_ADVANTAGE && effect.targetActorId === targetId);
};

/**
 * Pressing the Advantage: the bonus gained by inflicting a critical, on the next attack against that foe. The effect
 * is created and used up when the attacks are applied.
 */
export const CombatPressingAdvantagePlugin: CombatPlugin = {
  id: 'pressing-advantage',
  group: 'offense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && !!pressingAdvantage(ctx),
        apply: ctx => void rollModifiers(ctx).add('pressing-advantage', pressingAdvantage(ctx)!.value || 0),
      },
    ],
  },
};
