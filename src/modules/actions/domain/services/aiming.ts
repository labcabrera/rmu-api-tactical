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
