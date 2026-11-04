import { BLINDED, BLINDED_MODIFIER } from '../../../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { EXTRA_SENSE } from '../../../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import type { CombatContext } from '../combat-context.js';
import { isPreparing, rollModifiers, sourceHasStatus, sourceTraitTier } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

/** Extra Sense (§4.6): from tier III the attacker can attack targets it cannot see at -50, at -25 with IV and normally with V. */
const EXTRA_SENSE_UNSEEN: Record<number, number> = { 3: -50, 4: -25, 5: 0 };
const EXTRA_SENSE_MIN_TIER = 3;
const EXTRA_SENSE_MAX_TIER = 5;

/** Penalty of a blinded attacker: -100, or the one of its Extra Sense of tier III or more (workspace spec 076, §3.3). */
export const blindedPenalty = (ctx: CombatContext): { value: number; extraSense: number } => {
  const tier = Math.min(EXTRA_SENSE_MAX_TIER, sourceTraitTier(ctx, EXTRA_SENSE));
  if (tier < EXTRA_SENSE_MIN_TIER) return { value: BLINDED_MODIFIER, extraSense: 0 };
  return { value: Math.max(BLINDED_MODIFIER, EXTRA_SENSE_UNSEEN[tier]), extraSense: tier };
};

/**
 * Workspace spec 034: OB modifiers of the effects the critical and fumble texts give the attacker. `attack_penalty`
 * adds its penalties; `blinded` fights in pitch black (-100, ch. 15 Darkness and Blindness), less with Extra Sense III-V
 * (workspace spec 076).
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
        condition: ctx => isPreparing(ctx) && sourceHasStatus(ctx, BLINDED) && blindedPenalty(ctx).value !== 0,
        apply: ctx => {
          const { value, extraSense } = blindedPenalty(ctx);
          rollModifiers(ctx).add('blinded', value, extraSense ? { extraSense } : undefined);
        },
      },
    ],
  },
};
