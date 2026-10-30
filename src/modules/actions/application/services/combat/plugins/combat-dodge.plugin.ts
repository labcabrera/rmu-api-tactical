import type { CombatContext } from '../combat-context.js';
import {
  ignoredDefenseSkip,
  isAreaSpellAttack,
  isMelee,
  isPreparing,
  rollModifiers,
  targetInjuryPenalty,
  targetIgnoresDefense,
  targetSkill,
  targetSkillRanks,
} from '../combat-modifiers.js';
import type { ModifierParams } from '../../../../domain/value-objects/key-value-modifier.vo.js';
import { skip } from '../combat-phase.js';
import type { CombatPlugin } from '../combat-plugin.js';

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
const dodgeBonus = (ctx: CombatContext): { value: number; params: ModifierParams } => {
  const target = ctx.targetActor!;
  const mode = target.defenseMode?.dodge ?? 'none';
  const armor = Math.min(0, target.movement?.penalty || 0);
  const injury = targetInjuryPenalty(ctx);
  const ranks = targetSkillRanks(ctx, DODGE_SKILL);
  const skill = targetSkill(ctx, DODGE_SKILL);
  let value: number;
  switch (mode) {
    case 'passive':
      value = Math.min(ranks, MAX_PASSIVE_DODGE) + armor;
      break;
    case 'partial':
      value = Math.floor(skill / 2) + armor + injury;
      break;
    case 'full':
      value = skill + armor + injury;
      break;
    default:
      return { value: 0, params: {} };
  }
  value = Math.max(0, value);
  const halved = !isMelee(ctx);
  const params: ModifierParams = mode === 'passive' ? { mode, ranks, armor, halved } : { mode, skill, armor, injury, halved };
  return { value: halved ? Math.floor(value / 2) : value, params };
};

/** The target's dodge of the round, from its defence mode. A flatfooted target is not aware of the attack. */
export const CombatDodgePlugin: CombatPlugin = {
  id: 'dodge',
  group: 'defense',
  rule: '§9.6',
  hooks: {
    prepare: [
      {
        // An area attack spell cannot be dodged (RMCL 9.3).
        condition: ctx => {
          const dodge = ctx.targetActor?.defenseMode?.dodge;
          if (!isPreparing(ctx) || !dodge || dodge === 'none') return false;
          if (isAreaSpellAttack(ctx)) return skip('dodge-area-spell');
          return targetIgnoresDefense(ctx) ? ignoredDefenseSkip(ctx) : true;
        },
        apply: ctx => {
          const { value, params } = dodgeBonus(ctx);
          rollModifiers(ctx).add('dodge', -value, params);
        },
      },
    ],
  },
};
