import { CombatModifierBag } from '../combat-modifier-bag';
import { CombatPlugin } from '../combat-plugin';

const attackCountModifiers = new Map<number, number>([
  [2, -75],
  [3, -100],
  [4, -125],
  [5, -150],
]);

const ADDITIONAL_ATTACK_STEP = -25;
const ADDITIONAL_FOE_MODIFIER = -20;
const LAST_DEFINED_ATTACK_COUNT = 5;
const LAST_DEFINED_ATTACK_MODIFIER = -150;

export const CombatMultipleAttacksPlugin: CombatPlugin = {
  id: 'combat-multiple-attacks',
  name: 'Combat Multiple Attacks Plugin',
  version: '1.0.0',
  hooks: {
    prepare: [
      {
        apply: ctx => {
          if (!ctx.attackPreparation) {
            return ctx;
          }

          const modifiers = CombatModifierBag.from(ctx.attackPreparation.modifiers.rollModifiers);
          const attackNumberModifier = calculateAttackNumberModifier(ctx.attackNumber);
          const targetsModifier = calculateTargetsModifier(ctx.targetsNumber);

          modifiers.add('attackNumber', attackNumberModifier).add('attackTargets', targetsModifier);
          return ctx;
        },
      },
    ],
  },
};

function calculateAttackNumberModifier(attackNumber: number | undefined): number {
  if (!attackNumber || attackNumber <= 1) {
    return 0;
  }

  const tableModifier = attackCountModifiers.get(attackNumber);
  if (tableModifier !== undefined) {
    return tableModifier;
  }

  return LAST_DEFINED_ATTACK_MODIFIER + (attackNumber - LAST_DEFINED_ATTACK_COUNT) * ADDITIONAL_ATTACK_STEP;
}

function calculateTargetsModifier(targetsNumber: number | undefined): number {
  if (!targetsNumber || targetsNumber <= 1) {
    return 0;
  }

  return (targetsNumber - 1) * ADDITIONAL_FOE_MODIFIER;
}
