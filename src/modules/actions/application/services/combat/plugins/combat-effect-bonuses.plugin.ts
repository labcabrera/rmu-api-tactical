import {
  AIMING,
  BATTLE_CRY,
  DB_BONUS,
  OB_BONUS,
  type ActorRoundEffect,
} from '../../../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import type { ActorRound } from '../../../../../actor-rounds/domain/aggregates/actor-round.js';
import type { CombatContext } from '../combat-context.js';
import { isPreparing, rollModifiers } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

const effectsOf = (actor: ActorRound | undefined, status: string): ActorRoundEffect[] =>
  (actor?.activeEffects?.() ?? actor?.effects ?? []).filter(effect => effect.status === status);

const sumOf = (effects: ActorRoundEffect[]): number => effects.reduce((sum, effect) => sum + Math.max(0, effect.value ?? 0), 0);

/**
 * The `aiming` effect of the source that this attack uses (workspace spec 076, §2.4): a ranged attack against the foe it
 * aimed at, with the item it aimed with (any item when the effect does not name one).
 */
export const aimingEffectOf = (ctx: CombatContext): ActorRoundEffect | undefined => {
  if (ctx.attack?.type !== 'ranged') {
    return undefined;
  }
  const itemId = ctx.sourceAttack?.itemId ?? null;
  return effectsOf(ctx.sourceActor, AIMING).find(effect => {
    const aimedItem = effect.data?.itemId as string | undefined;
    return effect.targetActorId === ctx.attack?.modifiers.targetId && (!aimedItem || aimedItem === itemId);
  });
};

/**
 * Positive OB effects of the attacker (workspace spec 076, §2.4): the generic `ob_bonus` (they add up), Battle Cry and
 * the aiming at this target with this weapon. Each one has its key in the breakdown.
 */
export const CombatEffectOffenseBonusPlugin: CombatPlugin = {
  id: 'effect-ob-bonus',
  group: 'offense',
  hooks: {
    prepare: [
      {
        condition: isPreparing,
        apply: ctx => {
          const modifiers = rollModifiers(ctx);
          modifiers.add('ob-bonus', sumOf(effectsOf(ctx.sourceActor, OB_BONUS)));
          modifiers.add('battle-cry', sumOf(effectsOf(ctx.sourceActor, BATTLE_CRY).slice(0, 1)));
          modifiers.add('aiming', Math.max(0, aimingEffectOf(ctx)?.value ?? 0));
        },
      },
    ],
  },
};

/** Positive DB effects of the target (workspace spec 076, §2.4): the generic `db_bonus` (they add up) and Battle Cry. */
export const CombatEffectDefenseBonusPlugin: CombatPlugin = {
  id: 'effect-db-bonus',
  group: 'defense',
  hooks: {
    prepare: [
      {
        condition: isPreparing,
        apply: ctx => {
          const modifiers = rollModifiers(ctx);
          modifiers.add('db-bonus', -sumOf(effectsOf(ctx.targetActor, DB_BONUS)));
          modifiers.add('battle-cry-db', -sumOf(effectsOf(ctx.targetActor, BATTLE_CRY).slice(0, 1)));
        },
      },
    ],
  },
};
