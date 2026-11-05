import { SURVIVAL_INSTINCT } from '../../../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { ownParryOf, parriedWithAllOb as parriedWithAllObRule, parryAttackOf } from '../../../../domain/services/parry-rules.js';
import type { CombatContext } from '../combat-context.js';
import { rollModifiers, targetTraitTierForSkill } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

const SURVIVAL_INSTINCT_DB = 25;

/** The target parried this attacker with all the OB it had available (workspace spec 040, decision 3). */
const parriedWithAllOb = (ctx: CombatContext): boolean => parriedWithAllObRule(ctx.action.parries, ctx.targetActor?.actorId);

/** The talent was taken for the melee attack the parry comes from: the one with the highest OB (decision 4). */
const survivalInstinctApplies = (ctx: CombatContext): boolean => {
  const parryAttack = parryAttackOf(ctx.targetActor?.attacks, ownParryOf(ctx.action.parries, ctx.targetActor?.actorId));
  return !!parryAttack && targetTraitTierForSkill(ctx, SURVIVAL_INSTINCT, parryAttack.skillId) > 0;
};

/**
 * Survival Instinct (Character Companion, workspace spec 040, decisions 3-6): +25 DB against the foe the target parries
 * with all its available OB. Registered after the parry and fighting style plugins of the parry phase.
 */
export const CombatSurvivalInstinctPlugin: CombatPlugin = {
  id: 'survival-instinct',
  group: 'defense',
  hooks: {
    parry: [
      {
        condition: ctx => !!ctx.attack?.calculated,
        // Replaces the bonus of a previous declaration, as the parry plugin does.
        apply: ctx => {
          const modifiers = rollModifiers(ctx).remove('survival-instinct');
          if (!ctx.attack!.modifiers.disabledParry && survivalInstinctApplies(ctx) && parriedWithAllOb(ctx)) {
            modifiers.add('survival-instinct', -SURVIVAL_INSTINCT_DB);
          }
        },
      },
    ],
  },
};
