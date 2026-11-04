import type { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round.js';
import type { ReactionAlertData } from '../../../actor-rounds/domain/value-objects/actor-round-alert.vo.js';
import { ActorRoundTrait, OPPORTUNISTIC_STRIKE, RIPOSTE } from '../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import type { Action } from '../aggregates/action.js';
import type { ActionAttack } from '../value-objects/action-attack.vo.js';
import { ownParryOf, parriedWithAllOb, parryAttackOf } from './parry-rules.js';

/** Riposte (workspace spec 076, decision B2): the OB of the riposte is this less the attacker's total roll. */
export const RIPOSTE_BASE_OB = 50;

/** A reaction to raise, without the round and phase the caller stamps it with. */
export type ReactionTrigger = Omit<ReactionAlertData, 'round' | 'phase'>;

/** OB of a riposte: 50 less the total roll of the attack parried; it can be negative. */
export const riposteOb = (attackRollTotal: number): number => RIPOSTE_BASE_OB - attackRollTotal;

/**
 * Riposte (workspace spec 076, decision B2), once the attack is applied: the target has the talent for the melee
 * weapon it parried with, it parried with all its available OB, and the attack did no damage nor critical.
 */
export const riposteTrigger = (action: Action, attack: ActionAttack, defender: ActorRound): ReactionTrigger | undefined => {
  if (attack.type !== 'melee' || attack.modifiers.targetId !== defender.actorId || attack.modifiers.disabledParry) {
    return undefined;
  }
  const damage = attack.results?.attackTableEntry?.damage ?? 0;
  const criticals = attack.results?.criticals?.length ?? 0;
  if (damage > 0 || criticals > 0 || !parriedWithAllOb(action.parries, defender.actorId)) {
    return undefined;
  }
  const weapon = parryAttackOf(defender.attacks, ownParryOf(action.parries, defender.actorId));
  if (!weapon || ActorRoundTrait.tierForSkill(defender.traits, RIPOSTE, weapon.skillId) === 0) {
    return undefined;
  }
  const rollTotal = attack.calculated?.rollTotal ?? 0;
  return { traitId: RIPOSTE, triggerActionId: action.id, targetActorId: action.actorId, obOverride: riposteOb(rollTotal) };
};

/**
 * Opportunistic Strike (workspace spec 076, decision B3): a melee attack fumbles and its target has the talent with a
 * melee weapon of its specialization ready (not broken). Without a model of adjacency, only the target is warned.
 */
export const opportunisticStrikeTrigger = (action: Action, attack: ActionAttack, target: ActorRound): ReactionTrigger | undefined => {
  if (attack.type !== 'melee' || !attack.results?.fumble || target.actorId === action.actorId) {
    return undefined;
  }
  const armed = (target.attacks || []).some(
    weapon =>
      weapon.type === 'melee' && !weapon.broken && ActorRoundTrait.tierForSkill(target.traits, OPPORTUNISTIC_STRIKE, weapon.skillId) > 0,
  );
  if (!armed) {
    return undefined;
  }
  return { traitId: OPPORTUNISTIC_STRIKE, triggerActionId: action.id, targetActorId: action.actorId, obOverride: null };
};
