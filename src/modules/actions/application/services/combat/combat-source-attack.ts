import type { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundAttack } from '../../../../actor-rounds/domain/value-objects/actor-round-attack.vo.js';
import type { Action } from '../../../domain/aggregates/action.js';

/**
 * What an attack of an action strikes with: the weapon of the actor round with that name or, for an attack spell, the
 * spell's attack (spec 030, phase 4), read as a ranged weapon. Every attack of a cast uses the spell's attack, whatever
 * its name (a ball has one per target).
 */
export function sourceAttackOf(action: Action, actorRound: ActorRound | undefined, attackName: string): ActorRoundAttack | undefined {
  const spellAttack = action.actionType === 'cast_spell' ? action.spell?.attack : undefined;
  if (spellAttack) {
    return new ActorRoundAttack(
      attackName,
      [],
      spellAttack.bo,
      spellAttack.bo,
      'ranged',
      spellAttack.attackTable,
      spellAttack.fumbleTable,
      spellAttack.attackSize,
      spellAttack.fumble,
      false,
      null,
      spellAttack.ranges,
      false,
      'standard',
      spellAttack.skillId,
    );
  }
  return actorRound?.attacks?.find(attack => attack.attackName === attackName);
}
