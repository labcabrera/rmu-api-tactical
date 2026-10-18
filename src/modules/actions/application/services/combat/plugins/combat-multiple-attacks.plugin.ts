import { isPreparing, rollModifiers, sourceSkill } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

const SECOND_ATTACK_PENALTY = -75;
const ADDITIONAL_ATTACK_PENALTY = -25;
const ADDITIONAL_TARGET_PENALTY = -20;

export const CombatMultipleAttacksPlugin: CombatPlugin = {
  id: 'multiple-attacks',
  group: 'offense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && ((ctx.attackNumber || 1) > 1 || (ctx.targetsNumber || 1) > 1),
        apply: ctx => {
          const attacks = ctx.attackNumber || 1;
          const targets = ctx.targetsNumber || 1;
          // The skill offsets each penalty on its own, as in the Python calculator.
          const skill = sourceSkill(ctx, 'multiple-attacks');
          const attackPenalty = attacks > 1 ? SECOND_ATTACK_PENALTY + (attacks - 2) * ADDITIONAL_ATTACK_PENALTY : 0;
          const targetPenalty = (targets - 1) * ADDITIONAL_TARGET_PENALTY;
          rollModifiers(ctx).addWithSkill('attack-number', attackPenalty, skill).addWithSkill('attack-targets', targetPenalty, skill);
        },
      },
    ],
  },
};
