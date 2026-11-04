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
// Combat talents out of turn or on a roll (workspace spec 076, block B)
export const RIPOSTE = 'riposte';
export const OPPORTUNISTIC_STRIKE = 'opportunistic-strike';
/** Covers drawing and loading a weapon of its specialization (decision P3). */
export const QUICKDRAW = 'quickdraw';
export const SLOW_ON_THE_DRAW = 'slow-on-the-draw';
export const QUICK_ACTION = 'quick-action';
/** Taken for a ranged combat skill: aiming adds +5 per round, up to +5 per tier. */
export const SHARPSHOOTER = 'sharpshooter';
export const BATTLE_CRY_TRAIT = 'battle-cry';
export const SENSE_WEAKNESS = 'sense-weakness';
/** Taken for a melee weapon type. */
export const STUDY_OFFENSE = 'study-offense';
/** Taken for a melee weapon type: its effect goes to the next melee attack with that weapon. */
export const PRECISION_TRAIT = 'precision';
// Luck and roll talents of the roll profile (workspace spec 076, §2.8); every id is in the Character Companion catalog
export const LUCKY = 'lucky';
export const DRAMATIC_LUCK = 'dramatic-luck';
export const UNUSUAL_LUCK = 'unusual-luck';
export const TERRIBLE_LUCK = 'terrible-luck';
/** Taken for a skill category (its specialization is the category id). */
export const ABSOLUTE_EASE = 'absolute-ease';
/** The flaw of Absolute Ease: its failures become absolute too. */
export const ABSOLUTE_DISASTER = 'absolute-disaster';
export const SPASM_TRAIT = 'spasm';
// Senses and vision (workspace spec 076, block C); ids of the Character Companion catalog
export const ACUTE_HEARING = 'acute-hearing';
export const ACUTE_SMELL = 'acute-smell';
export const ACUTE_TASTE = 'acute-taste';
export const ACUTE_TOUCH = 'acute-touch';
export const ACUTE_VISION = 'acute-vision';
export const POOR_HEARING = 'poor-hearing';
export const POOR_SMELL = 'poor-smell';
export const POOR_TASTE = 'poor-taste';
export const POOR_TOUCH = 'poor-touch';
export const POOR_VISION = 'poor-vision';
export const MISSING_SENSE_HEARING = 'missing-sense-hearing';
export const MISSING_SENSE_SMELL = 'missing-sense-smell';
export const MISSING_SENSE_TASTE = 'missing-sense-taste';
export const MISSING_SENSE_TOUCH = 'missing-sense-touch';
export const MISSING_SENSE_VISION = 'missing-sense-vision';
export const EXTRA_SENSE = 'extra-sense';
export const HEARING_CAT = 'hearing-cat';
export const HEARING_DOG = 'hearing-dog';
export const HEARING_HARE = 'hearing-hare';
export const SIGHT_GECKO = 'sight-gecko';
export const SIGHT_EAGLE = 'sight-eagle';
export const SIGHT_HAWK = 'sight-hawk';
export const HEATSENSE = 'heatsense';
export const TETRACHROMATIC_VISION = 'tetrachromatic-vision';
export const NIGHTVISION = 'nightvision';
export const DARKVISION = 'darkvision';
export const LIGHT_SENSITIVITY = 'light-sensitivity';

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
