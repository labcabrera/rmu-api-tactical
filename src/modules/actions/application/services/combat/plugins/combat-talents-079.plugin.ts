import { EXTRA_JOINTS } from '../../../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import {
  type Element,
  elementalModifier,
  elementalParams,
  elementOfAttackTable,
  elementOfCritical,
  ELEMENTAL_RULE,
} from '../../../../../actor-rounds/domain/services/elemental-talents.js';
import type { CombatContext } from '../combat-context.js';
import { isPreparing, rollModifiers, sourceTraitTier, targetTraits } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

/** Extra Joints: +20 to the activity of the flexible limb, also an attack with it (Core Law ch. 4). */
export const EXTRA_JOINTS_BONUS = 20;

/**
 * Element of the attack, known before its roll: the critical type of an attack spell, else the elemental attack table
 * (fire, cold, ice, lightning bolts and balls). Null for the rest.
 */
export const attackElement = (ctx: CombatContext): Element | null => {
  const spellAttack = ctx.action?.spell?.attack;
  if (spellAttack) {
    return elementOfCritical(spellAttack.criticalType) ?? elementOfAttackTable(spellAttack.attackTable);
  }
  return elementOfAttackTable(ctx.sourceAttack?.attackTable);
};

/**
 * Workspace spec 079, D4: Elemental Resistance and Susceptibility of the target, +5/-5 per tier to its DB against an
 * attack of its element. The DB goes against the attacker, so the line is the negative of the modifier. The target's
 * defences being ignored (flatfooted, frenzy) does not matter: it is a natural resistance.
 */
export const CombatElementalDefensePlugin: CombatPlugin = {
  id: 'elemental-defense',
  group: 'defense',
  rule: ELEMENTAL_RULE,
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && !!attackElement(ctx) && elementalModifier(targetTraits(ctx), attackElement(ctx)) !== 0,
        apply: ctx => {
          const element = attackElement(ctx)!;
          const traits = targetTraits(ctx);
          rollModifiers(ctx).add('elemental-talent', -elementalModifier(traits, element), elementalParams(traits, element));
        },
      },
    ],
  },
};

/** Workspace spec 079, D3: the attack is made with the flexible limb of Extra Joints, +20 when the attacker has it. */
export const CombatExtraJointsPlugin: CombatPlugin = {
  id: 'extra-joints',
  group: 'offense',
  rule: 'Core Law ch. 4',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && !!ctx.attack?.modifiers?.extraJoints && sourceTraitTier(ctx, EXTRA_JOINTS) > 0,
        apply: ctx => void rollModifiers(ctx).add(EXTRA_JOINTS, EXTRA_JOINTS_BONUS),
      },
    ],
  },
};
