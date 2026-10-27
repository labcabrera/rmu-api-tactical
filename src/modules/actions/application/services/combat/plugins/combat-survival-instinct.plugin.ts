import { SURVIVAL_INSTINCT } from '../../../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import type { CombatContext } from '../combat-context.js';
import { rollModifiers, targetTraitTierForSkill } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

const SURVIVAL_INSTINCT_DB = 25;

/**
 * The target parried this attacker with all the OB it had available (workspace spec 040, decision 3): one parry of
 * its own, not a protection, equal to its available OB. A carried-over parry counts when the first one did.
 */
const parriedWithAllOb = (ctx: CombatContext): boolean => {
  const targetId = ctx.targetActor?.actorId;
  return (ctx.action.parries || []).some(
    parry =>
      parry.actorId === targetId &&
      parry.targetActorId === targetId &&
      parry.parryType === 'parry' &&
      parry.parry > 0 &&
      (parry.carriedOver ? !!parry.fullParry : parry.parry >= parry.parryAvailable),
  );
};

/** The talent was taken for the melee attack the parry comes from: the one with the highest OB (decision 4). */
const survivalInstinctApplies = (ctx: CombatContext): boolean => {
  const parryAttack = (ctx.targetActor?.attacks || [])
    .filter(attack => attack.type === 'melee')
    .reduce<{ skillId: string | null; currentBo: number } | undefined>(
      (best, attack) => (!best || attack.currentBo > best.currentBo ? attack : best),
      undefined,
    );
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
