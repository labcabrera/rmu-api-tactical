import type { PositionalTarget } from '../../../../domain/value-objects/action-attack-modifiers.vo.js';
import {
  isMelee,
  isPreparing,
  preparation,
  rollModifiers,
  targetFoes,
  targetHasStatus,
  targetIsFlatfooted,
  targetSkill,
} from '../combat-modifiers.js';
import { skip } from '../combat-phase.js';
import type { CombatContext } from '../combat-context.js';
import type { CombatPlugin } from '../combat-plugin.js';

const positionalTargetModifiers: Record<PositionalTarget, number> = {
  none: 0,
  flank: 15,
  rear: 35,
};

/** The bonus of the declared position, applied (not flatfooted, in melee). */
const appliedBonus = (ctx: CombatContext): number => {
  const position = preparation(ctx).situationalModifiers.positionalTarget;
  return position === 'none' || !isMelee(ctx) || targetIsFlatfooted(ctx) ? 0 : positionalTargetModifiers[position] || 0;
};

/**
 * Flank and rear bonuses in melee. Against a flatfooted target the `flatfooted-target` plugin gives the rear bonus.
 *
 * Workspace spec 079, decision A1 (§9.5 Facing and Flanking): the target's Reverse Strike reduces that bonus at 2:1,
 * its skill first divided by the foes attacking it this round (rounded down), as `positional-target-skill`. Not when the
 * target is surprised (it is not aware of the attacker); a flatfooted one has no positional bonus to reduce. Sharing the
 * skill between this defence and its own attacks is left to the game master (custom bonus).
 */
export const CombatPositionalTargetPlugin: CombatPlugin = {
  id: 'positional-target',
  group: 'situation',
  rule: '§9.5',
  hooks: {
    prepare: [
      {
        condition: ctx => {
          if (!isPreparing(ctx)) return false;
          const position = preparation(ctx).situationalModifiers.positionalTarget;
          if (position === 'none') return false;
          if (!isMelee(ctx)) return skip('positional-melee-only', { position });
          return targetIsFlatfooted(ctx) ? skip('counted-by-flatfooted', { position }) : true;
        },
        apply: ctx => {
          const position = preparation(ctx).situationalModifiers.positionalTarget;
          rollModifiers(ctx).add('positional-target', positionalTargetModifiers[position] || 0, { position });
        },
      },
      {
        condition: ctx => {
          if (!isPreparing(ctx) || appliedBonus(ctx) === 0 || targetSkill(ctx, 'reverse-strike') <= 0) return false;
          const surprised = targetHasStatus(ctx, 'surprised') || !!ctx.attack?.modifiers.surprisedFoe;
          return surprised ? skip('reverse-strike-surprised', { skill: targetSkill(ctx, 'reverse-strike') }) : true;
        },
        apply: ctx => {
          const bonus = appliedBonus(ctx);
          const skill = targetSkill(ctx, 'reverse-strike');
          const foes = targetFoes(ctx);
          const offset = Math.min(bonus, Math.floor(skill / 2 / foes));
          rollModifiers(ctx).add('positional-target-skill', -offset, { skill, foes, bonus });
        },
      },
    ],
  },
};
