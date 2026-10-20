import { CombatContext } from '../combat-context';
import {
  isMelee,
  isPreparing,
  rollModifiers,
  targetInjuryPenalty,
  targetIsFlatfooted,
  targetSkill,
  targetSkillRanks,
} from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

/** Most DB a passive dodge gives (§9.6 Dodging). */
const MAX_PASSIVE_DODGE = 50;
/** Movement skill used to dodge: the rule allows others by terrain, only Running (on land) is modelled. */
const DODGE_SKILL = 'running';

/**
 * DB of the declared dodge (§9.6 Dodging): the Running ranks (up to +50) when passive, half the skill when partial
 * and the whole skill when full. The armour and encumbrance penalty (`movement.penalty`) reduces all of them, the
 * injury penalties the partial and full ones. Against a ranged or thrown attack the result is halved after the
 * penalties. It never turns into a DB penalty.
 */
const dodgeBonus = (ctx: CombatContext): number => {
  const target = ctx.targetActor!;
  const armorPenalty = Math.min(0, target.movement?.penalty || 0);
  let value: number;
  switch (target.defenseMode?.dodge) {
    case 'passive':
      value = Math.min(targetSkillRanks(ctx, DODGE_SKILL), MAX_PASSIVE_DODGE) + armorPenalty;
      break;
    case 'partial':
      value = Math.floor(targetSkill(ctx, DODGE_SKILL) / 2) + armorPenalty + targetInjuryPenalty(ctx);
      break;
    case 'full':
      value = targetSkill(ctx, DODGE_SKILL) + armorPenalty + targetInjuryPenalty(ctx);
      break;
    default:
      return 0;
  }
  value = Math.max(0, value);
  return isMelee(ctx) ? value : Math.floor(value / 2);
};

/** The target's dodge of the round, from its defence mode. A flatfooted target is not aware of the attack. */
export const CombatDodgePlugin: CombatPlugin = {
  id: 'dodge',
  group: 'defense',
  hooks: {
    prepare: [
      {
        condition: ctx =>
          isPreparing(ctx) && !!ctx.targetActor?.defenseMode && ctx.targetActor.defenseMode.dodge !== 'none' && !targetIsFlatfooted(ctx),
        apply: ctx => void rollModifiers(ctx).add('dodge', -dodgeBonus(ctx)),
      },
    ],
  },
};
