import { randomUUID } from 'crypto';
import type { ActorRound, EffectApplication } from '../../../actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundEffect, AIMING } from '../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { ActorRoundTrait, SHARPSHOOTER } from '../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import type { ActionAim } from '../aggregates/action.js';

/** Sharpshooter (workspace spec 076, decision B6): +5 OB per full round aiming, up to +5 per tier. */
export const AIMING_PER_ROUND = 5;

/** The Sharpshooter tier of the actor for the ranged weapon `itemId`, 0 when it has none for it. */
export const sharpshooterTier = (actorRound: ActorRound, itemId: string): number => {
  const attack = (actorRound.attacks || []).find(each => each.itemId === itemId && each.type === 'ranged');
  return attack ? ActorRoundTrait.tierForSkill(actorRound.traits, SHARPSHOOTER, attack.skillId) : 0;
};

/**
 * A completed `aim` action (workspace spec 076, decision B6): the aiming of the actor at that foe with that weapon goes
 * up by 5, up to 5 per tier of its Sharpshooter; aiming at another foe or with another weapon starts again at 5. The
 * new `aiming` replaces the old one. Answers it.
 */
export const accumulateAiming = (actorRound: ActorRound, aim: ActionAim, application?: EffectApplication): ActorRoundEffect => {
  const max = AIMING_PER_ROUND * Math.max(1, sharpshooterTier(actorRound, aim.itemId));
  const current = (actorRound.effects || []).find(effect => effect.status === AIMING);
  const same = !!current && current.targetActorId === aim.targetActorId && current.data?.itemId === aim.itemId;
  const value = Math.min((same ? (current.value ?? 0) : 0) + AIMING_PER_ROUND, max);
  const effect = new ActorRoundEffect(randomUUID(), AIMING, value, undefined);
  effect.targetActorId = aim.targetActorId;
  effect.data = { itemId: aim.itemId };
  actorRound.applyAttackResults(undefined, [effect], undefined, application);
  return effect;
};

/**
 * Workspace spec 076, §2.7: the aiming counts for a ranged attack against the foe aimed at with the item aimed with (any
 * item when the effect names none, as one the game master added by hand).
 */
export const aimingMatches = (
  effect: ActorRoundEffect,
  targetId: string | null | undefined,
  itemId: string | null | undefined,
): boolean => {
  const aimedItem = effect.data?.itemId as string | undefined;
  return effect.status === AIMING && !!targetId && effect.targetActorId === targetId && (!aimedItem || aimedItem === itemId);
};

/**
 * Workspace spec 076, §2.7: declaring any action but aiming again or a ranged attack loses the aiming, a free or instant
 * one too (drawing another weapon, a maneuver, a movement). A ranged attack keeps it until it is applied, since its
 * foe and weapon are only known then.
 */
export const keepsAimingOnDeclaration = (actionType: string): boolean => actionType === 'aim' || actionType === 'ranged_attack';

/** A ranged attack of an action, as aiming reads it: its foe and the item it attacks with. */
export interface AimedAttack {
  targetId: string | null | undefined;
  itemId: string | null | undefined;
}

/** What applying the attacks of an action does to the aiming of the attacker: used for its bonus, or lost. */
export interface AimingAfterAttacks {
  used: string[];
  lost: string[];
}

/**
 * Workspace spec 076, §2.7: applying the ranged attacks of an action uses up the aiming that one of them took its bonus
 * from (same foe, same item). An aiming no attack matches got no bonus and is not used, but is lost all the same: the
 * actor did something other than shoot at that foe with that weapon.
 */
export const aimingAfterRangedAttacks = (actorRound: ActorRound, attacks: AimedAttack[]): AimingAfterAttacks => {
  const result: AimingAfterAttacks = { used: [], lost: [] };
  if (attacks.length === 0) {
    return result;
  }
  (actorRound.effects || [])
    .filter(effect => effect.status === AIMING)
    .forEach(effect => {
      const used = attacks.some(attack => aimingMatches(effect, attack.targetId, attack.itemId));
      (used ? result.used : result.lost).push(effect.id);
    });
  return result;
};
