/** Trait ids read by the combat rules (core catalogue ids). */
export const LIGHT_BONED = 'light-boned';
export const FOILER = 'foiler';
export const PRESSING_THE_ADVANTAGE = 'pressing-the-advantage';
export const NON_VIOLENT_TRAIT = 'non-violent';
export const SLOW_BLEEDER = 'slow-bleeder';
export const RAPID_BLEEDER = 'rapid-bleeder';
export const UNCOORDINATED = 'uncoordinated';
export const STRIKE_REFLEX = 'strike-reflex';
// Character Companion (workspace spec 039)
export const PAIN_RESISTANCE = 'pain-resistance';
export const STUN_RESISTANCE = 'stun-resistance';
export const GRACEFUL_GAIT = 'graceful-gait';
// Combat state of the Character Companion talents (workspace spec 040)
export const NATURAL_HASTE = 'natural-haste';
export const SURVIVAL_INSTINCT = 'survival-instinct';
export const FRENZY_TRAIT = 'frenzy';
export const FRENZY_GREATER_TRAIT = 'frenzy-greater';

/** Talent or flaw of the actor, copied from its character sheet. */
export class ActorRoundTrait {
  constructor(
    public readonly traitId: string,
    /** 1 for traits without tiers. */
    public readonly tier: number,
    /** Skill (`skillId` or `skillId@specialization`), weapon type or other value the trait was taken for. */
    public readonly specialization: string | null,
  ) {}

  /** Tier of the trait, 0 when the actor does not have it. The specialization is not checked. */
  static tierOf(traits: ActorRoundTrait[] | undefined, traitId: string): number {
    return ActorRoundTrait.maxTier((traits || []).filter(trait => trait.traitId === traitId));
  }

  /**
   * Tier of the trait for an attack with the weapon skill `skillId` (such as `melee-weapon@blade`), 0 when the actor
   * does not have it or it was taken for another skill or weapon type. A trait without specialization always applies.
   */
  static tierForSkill(traits: ActorRoundTrait[] | undefined, traitId: string, skillId: string | null | undefined): number {
    return ActorRoundTrait.maxTier(
      (traits || []).filter(trait => trait.traitId === traitId && ActorRoundTrait.matchesSkill(trait.specialization, skillId)),
    );
  }

  /**
   * Specialization matching (spec 008, §1): `skillId@spec` matches that specialization only, a bare `skillId` every
   * specialization of the skill, and a weapon type the part after `@` of the attack's skill.
   */
  static matchesSkill(specialization: string | null | undefined, skillId: string | null | undefined): boolean {
    if (!specialization) {
      return true;
    }
    if (!skillId) {
      return false;
    }
    if (specialization.includes('@')) {
      return specialization === skillId;
    }
    const [baseSkill, weaponType] = skillId.split('@');
    return specialization === baseSkill || specialization === weaponType;
  }

  private static maxTier(traits: ActorRoundTrait[]): number {
    return traits.reduce((max, trait) => Math.max(max, trait.tier || 1), 0);
  }
}
