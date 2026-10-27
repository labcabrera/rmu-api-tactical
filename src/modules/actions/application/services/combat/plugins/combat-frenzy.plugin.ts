import type { CombatContext } from '../combat-context.js';
import { isPreparing, rollModifiers } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

/** Strength bonus of each frenzy level (Frenzy +5, Greater Frenzy +10). */
const FRENZY_STRENGTH_BONUS = 5;
/** Times St enters the OB of attacks without a weight from the sheet: twice in melee, once at range. */
const DEFAULT_MELEE_STRENGTH_WEIGHT = 2;
const DEFAULT_RANGED_STRENGTH_WEIGHT = 1;

export const sourceFrenzyLevel = (ctx: CombatContext): number => ctx.sourceActor?.frenzyLevel() ?? 0;

const strengthWeight = (ctx: CombatContext): number => {
  const attack = ctx.sourceAttack;
  if (!attack) return 0;
  if (attack.strengthWeight !== null && attack.strengthWeight !== undefined) return attack.strengthWeight;
  return attack.type === 'melee' ? DEFAULT_MELEE_STRENGTH_WEIGHT : DEFAULT_RANGED_STRENGTH_WEIGHT;
};

/**
 * Frenzy of the attacker (Character Companion, workspace spec 040, decision 10): its Strength bonus goes up by 5 per
 * level, once for each time St is in the skill bonus of the attack. The larger size is read by the attack-size plugin,
 * and the lost defense of a frenzied target by the DB, shield and dodge plugins.
 */
export const CombatFrenzyPlugin: CombatPlugin = {
  id: 'frenzy',
  group: 'offense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && sourceFrenzyLevel(ctx) > 0 && strengthWeight(ctx) > 0,
        apply: ctx => void rollModifiers(ctx).add('frenzy-strength', FRENZY_STRENGTH_BONUS * strengthWeight(ctx) * sourceFrenzyLevel(ctx)),
      },
    ],
  },
};
