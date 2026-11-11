import type { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round.js';
import { type ActorRoundEffect, PRECISION } from '../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { ActorRoundTrait, PRECISION_TRAIT } from '../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';

/**
 * The `precision` effect a melee attack of `actor` against `targetId` with the weapon skill `skillId` takes (workspace
 * spec 076, decision B9): the one against that foe, when the actor's Precision was taken for that weapon. Undefined
 * otherwise.
 */
export const precisionEffectFor = (
  actor: ActorRound | undefined,
  attackType: string | undefined,
  targetId: string | undefined,
  skillId: string | null | undefined,
): ActorRoundEffect | undefined => {
  if (!actor || attackType !== 'melee' || !targetId) {
    return undefined;
  }
  if (ActorRoundTrait.tierForSkill(actor.traits, PRECISION_TRAIT, skillId) === 0) {
    return undefined;
  }
  return (actor.effects || []).find(effect => effect.status === PRECISION && effect.targetActorId === targetId);
};

/** OB the attacker gave up to its Precision maneuver, taken from the attack (0 or more). */
export const precisionObPenalty = (effect: ActorRoundEffect): number => Math.max(0, Number(effect.data?.obPenalty ?? 0) || 0);
