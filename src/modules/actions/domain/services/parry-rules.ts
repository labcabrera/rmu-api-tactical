import type { ActorRoundAttack } from '../../../actor-rounds/domain/value-objects/actor-round-attack.vo.js';
import type { ActionParry } from '../value-objects/action-attack-parry.vo.js';

/**
 * The parry of the defender against the attacker: its own (not a protection), with OB given. Undefined when it did not
 * parry.
 */
export const ownParryOf = (parries: ActionParry[] | null | undefined, defenderId: string | undefined): ActionParry | undefined =>
  (parries || []).find(
    parry => parry.actorId === defenderId && parry.targetActorId === defenderId && parry.parryType === 'parry' && parry.parry > 0,
  );

/**
 * The defender parried the attacker with all the OB it had available (workspace spec 040, decision 3; spec 076,
 * decision B2): one parry of its own, not a protection, equal to its available OB. A carried-over parry counts when
 * the first one did.
 */
export const parriedWithAllOb = (parries: ActionParry[] | null | undefined, defenderId: string | undefined): boolean => {
  const parry = ownParryOf(parries, defenderId);
  return !!parry && (parry.carriedOver ? !!parry.fullParry : parry.parry >= parry.parryAvailable);
};

/**
 * The melee attack the defender parries with (workspace spec 040, decision 4): the one the parry was computed from
 * when it says so, else the one with the most OB left.
 */
export const parryAttackOf = (attacks: ActorRoundAttack[] | null | undefined, parry?: ActionParry): ActorRoundAttack | undefined => {
  const melee = (attacks || []).filter(attack => attack.type === 'melee' && !attack.broken);
  const named = parry?.breakdown?.attackName ? melee.find(attack => attack.attackName === parry.breakdown!.attackName) : undefined;
  return (
    named ??
    melee.reduce<ActorRoundAttack | undefined>((best, attack) => (!best || attack.currentBo > best.currentBo ? attack : best), undefined)
  );
};
