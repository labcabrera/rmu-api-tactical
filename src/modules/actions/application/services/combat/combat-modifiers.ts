import { CombatContext } from './combat-context';
import { CombatAttackPreparationModifiers, CombatAttackSourceSkill } from './combat-attack-calculation';
import { CombatModifierBag } from './combat-modifier-bag';
import { normalizeChargeSpeed } from '../../../domain/value-objects/action-attack-modifiers.vo';
import { ActorRoundTrait, LIGHT_BONED } from '../../../../actor-rounds/domain/value-objets/actor-round-trait.vo';

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

/**
 * Sizes the attacker is above the target, negative when it is smaller (§9.4): smaller combatants are harder to hit.
 * The combatants' sizes count, not the attack's: a charge or a bigger weapon changes the critical severity but not
 * the DB, as the book's examples show (the charge against a troll, Kirax's spear in §9.9).
 */
export const sizeDifference = (ctx: CombatContext): number => {
  if (!ctx.sourceActor || !ctx.targetActor) {
    return 0;
  }
  return (ctx.sourceActor.size || 0) - targetEffectiveSize(ctx);
};

/** Size of the target against attacks: a Light-boned target counts one size smaller per tier. */
export const targetEffectiveSize = (ctx: CombatContext): number => (ctx.targetActor?.size || 0) - targetTraitTier(ctx, LIGHT_BONED);

const sourceTraits = (ctx: CombatContext) => ctx.sourceTraits ?? ctx.sourceActor?.traits;
const targetTraits = (ctx: CombatContext) => ctx.targetTraits ?? ctx.targetActor?.traits;

/** Tier of one of the source's traits (0 when it does not have it). */
export const sourceTraitTier = (ctx: CombatContext, traitId: string): number => ActorRoundTrait.tierOf(sourceTraits(ctx), traitId);

/** Tier of one of the target's traits (0 when it does not have it). */
export const targetTraitTier = (ctx: CombatContext, traitId: string): number => ActorRoundTrait.tierOf(targetTraits(ctx), traitId);

/** Tier of one of the source's traits that applies to attacks with the weapon skill `skillId`. */
export const sourceTraitTierForSkill = (ctx: CombatContext, traitId: string, skillId: string | null | undefined): number =>
  ActorRoundTrait.tierForSkill(sourceTraits(ctx), traitId, skillId);

/** Tier of one of the target's traits that applies to attacks with the weapon skill `skillId`. */
export const targetTraitTierForSkill = (ctx: CombatContext, traitId: string, skillId: string | null | undefined): number =>
  ActorRoundTrait.tierForSkill(targetTraits(ctx), traitId, skillId);

const findSkill = (skills: CombatAttackSourceSkill[] | undefined, skillId: string) => skills?.find(skill => skill.skillId === skillId);

/** Bonus of one of the source's combat skills (0 when it does not have it). */
export const sourceSkill = (ctx: CombatContext, skillId: string): number => findSkill(ctx.sourceSkills, skillId)?.bonus || 0;

/** Ranks of one of the source's combat skills (0 when it does not have it or the sheet does not give them). */
export const sourceSkillRanks = (ctx: CombatContext, skillId: string): number => findSkill(ctx.sourceSkills, skillId)?.ranks || 0;

/** Bonus of one of the target's combat skills. */
export const targetSkill = (ctx: CombatContext, skillId: string): number => findSkill(ctx.targetSkills, skillId)?.bonus || 0;

/** Ranks of one of the target's combat skills. */
export const targetSkillRanks = (ctx: CombatContext, skillId: string): number => findSkill(ctx.targetSkills, skillId)?.ranks || 0;

/** Melee attack: thrown and ranged attacks are not. */
export const isMelee = (ctx: CombatContext): boolean => ctx.attack?.type === 'melee';

/**
 * Skills that some combat rule reads: the only ones loaded from the character sheets. The source's are offsets and
 * the ambush; the target's are its active defences (Running to dodge, Shield to block).
 */
export const COMBAT_SKILL_IDS = [
  'multiple-attacks',
  'reverse-strike',
  'footwork',
  'restricted-quarters',
  'called-shot',
  'ambush',
  'running',
  'shield',
];

/** Inputs of the prepare phase. Only call it from a prepare hook (the handler always sets the preparation there). */
export const preparation = (ctx: CombatContext): CombatAttackPreparationModifiers => ctx.attackPreparation!.modifiers;

export const isPreparing = (ctx: CombatContext): boolean => !!ctx.attackPreparation;

/** The source has the status as an active effect. */
export const sourceHasStatus = (ctx: CombatContext, status: string): boolean =>
  ctx.attackPreparation?.modifiers.situationalModifiers.sourceStatus.includes(status) || false;

/** The target has the status as an active effect. */
export const targetHasStatus = (ctx: CombatContext, status: string): boolean =>
  ctx.attackPreparation?.modifiers.situationalModifiers.targetStatus.includes(status) || false;

/**
 * The target is flatfooted (§8.3 Surprise, §9.5): read from its effects while preparing, so that a declared position
 * or a manual flag cannot double the bonuses.
 */
export const targetIsFlatfooted = (ctx: CombatContext): boolean => targetHasStatus(ctx, 'flatfooted');

/**
 * Penalties of the target that reduce its partial and full dodge and block (§9.6): its injuries (hits, criticals,
 * stun, fatigue). The defender's pace is not declared, so its pace penalty is not known here.
 */
export const targetInjuryPenalty = (ctx: CombatContext): number => Math.min(0, ctx.targetActor?.getPenaltySum() || 0);
