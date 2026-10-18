import { CombatContext } from './combat-context';
import { CombatAttackPreparationModifiers } from './combat-attack-calculation';
import { CombatModifierBag } from './combat-modifier-bag';
import { normalizeChargeSpeed } from '../../../domain/value-objects/action-attack-modifiers.vo';

/**
 * Roll modifiers of the attack being processed, stamped with the running plugin. While preparing they are the
 * preparation's list; afterwards (parry, roll) the attack's calculated list.
 */
export const rollModifiers = (ctx: CombatContext): CombatModifierBag =>
  CombatModifierBag.from(ctx.attackPreparation?.modifiers.rollModifiers ?? ctx.attack?.calculated?.rollModifiers, ctx.plugin);

/** Critical roll modifiers of the attack being processed, stamped with the running plugin. */
export const criticalModifiers = (ctx: CombatContext): CombatModifierBag => {
  if (ctx.attackPreparation) {
    return CombatModifierBag.from(ctx.attackPreparation.modifiers.criticalModifiers, ctx.plugin);
  }
  const calculated = ctx.attack?.calculated;
  if (calculated && !calculated.criticalModifiers) {
    calculated.criticalModifiers = [];
  }
  return CombatModifierBag.from(calculated?.criticalModifiers, ctx.plugin);
};

/** A charge adds to the attacker's size: one size jogging, two sprinting. */
export const chargeSizeAdjustment = (chargeSpeed: string | undefined | null): number => {
  switch (normalizeChargeSpeed(chargeSpeed)) {
    case 'jog':
      return 1;
    case 'sprint':
      return 2;
    default:
      return 0;
  }
};

/** Sizes the attacker (with its charge) is above the target, negative when it is smaller. */
export const sizeDifference = (ctx: CombatContext): number => {
  if (!ctx.sourceActor || !ctx.targetActor) {
    return 0;
  }
  return ctx.sourceActor.size + chargeSizeAdjustment(ctx.attack?.modifiers.chargeSpeed) - ctx.targetActor.size;
};

/** Bonus of one of the source's combat skills (0 when it does not have it). */
export const sourceSkill = (ctx: CombatContext, skillId: string): number =>
  ctx.sourceSkills?.find(skill => skill.skillId === skillId)?.bonus || 0;

/** Melee attack: thrown and ranged attacks are not. */
export const isMelee = (ctx: CombatContext): boolean => ctx.attack?.type === 'melee';

/** Skills of the source that some combat rule reads: the only ones loaded from its character sheet. */
export const COMBAT_SKILL_IDS = ['multiple-attacks', 'reverse-strike', 'footwork', 'restricted-quarters', 'called-shot'];

/** Inputs of the prepare phase. Only call it from a prepare hook (the handler always sets the preparation there). */
export const preparation = (ctx: CombatContext): CombatAttackPreparationModifiers => ctx.attackPreparation!.modifiers;

export const isPreparing = (ctx: CombatContext): boolean => !!ctx.attackPreparation;

/** The source has the status as an active effect. */
export const sourceHasStatus = (ctx: CombatContext, status: string): boolean =>
  ctx.attackPreparation?.modifiers.situationalModifiers.sourceStatus.includes(status) || false;

/** The target has the status as an active effect. */
export const targetHasStatus = (ctx: CombatContext, status: string): boolean =>
  ctx.attackPreparation?.modifiers.situationalModifiers.targetStatus.includes(status) || false;
