import { FOILER } from '../../../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import type { CombatContext } from '../combat-context.js';
import { isPreparing, preparation, targetIsFlatfooted, targetTraitTierForSkill } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

/**
 * Foiler tier of the target for this round: it counts when the target has a melee attack declared this round with a
 * weapon the talent was taken for. A declared action without prepared attacks may use any of its melee attacks.
 */
export const foilerTier = (ctx: CombatContext): number => {
  const target = ctx.targetActor;
  if (!target) {
    return 0;
  }
  const meleeActions = (ctx.roundActions || []).filter(action => action.actorId === target.actorId && action.actionType === 'melee_attack');
  if (meleeActions.length === 0) {
    return 0;
  }
  const declaredNames = meleeActions.flatMap(action => (action.attacks || []).map(attack => attack.attackName));
  const weapons = (target.attacks || []).filter(
    attack => attack.type === 'melee' && (declaredNames.length === 0 || declaredNames.includes(attack.attackName)),
  );
  return weapons.reduce((max, attack) => Math.max(max, targetTraitTierForSkill(ctx, FOILER, attack.skillId)), 0);
};

/** Foiler: a target aware of the attack widens the attacker's fumble range by its tier. */
export const CombatFoilerPlugin: CombatPlugin = {
  id: 'foiler',
  group: 'defense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && !targetIsFlatfooted(ctx) && foilerTier(ctx) > 0,
        apply: ctx => {
          const tier = foilerTier(ctx);
          preparation(ctx).fumble = (preparation(ctx).fumble || 0) + tier;
          ctx.trace.push({ source: 'foiler', message: `Fumble range widened by ${tier}`, data: { fumble: preparation(ctx).fumble } });
        },
      },
    ],
  },
};
