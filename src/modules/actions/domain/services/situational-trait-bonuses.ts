import {
  ActorRoundTrait,
  ANIMAL_EMPATHY,
  DISTINCT_ODOR,
  EMPATHY,
  EXTRA_JOINTS,
  GOLDEN_THROAT,
  HEAVY_SLEEPER,
  LIGHT_SLEEPER,
  MUSICAL,
  NEUTRAL_ODOR,
  PERFECT_PITCH,
  WINGS_VESTIGIAL,
} from '../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import { KeyValueModifier, type ModifierParams } from '../value-objects/key-value-modifier.vo.js';
import { FALL_CONTROL, type ManeuverPurpose } from '../value-objects/maneuver-purpose.vo.js';

/** Rule reference of the situational talents (Core Law ch. 4; the Character Companion for Musical). */
export const SITUATIONAL_TRAIT_RULE = 'Core Law ch. 4';

/** Error of a situational talent that the actor does not have or that does not apply to the skill rolled. */
export const ERR_SITUATIONAL_TRAIT = 'err-maneuver-situational-trait';

/**
 * Situation in which a talent helps, shown to the game master next to its checkbox (i18n `situational-trait-<id>`):
 * calming or persuading by voice, reading emotions, an animal of its type, the flexible limb, waking up, a deliberate
 * fall and perceiving by smell.
 */
export type SituationalCondition =
  'calm-or-persuade' | 'read-emotions' | 'animal-of-its-type' | 'flexible-limb' | 'wake-up' | 'fall-control' | 'perceive-by-smell';

/**
 * A talent that only helps in some situations (workspace spec 079, D3), as the fixed style bonuses of
 * `STYLE_SKILL_BONUSES`. They are not in the sheet totals: the game master ticks the ones that apply when the maneuver
 * is resolved (`ticked`), or they apply on their own (`automatic`, with a purpose of the maneuver).
 */
export interface SituationalTraitBonus {
  traitId: string;
  /** Skills it helps; with neither skills nor categories, any maneuver (the flexible limb). */
  skills?: string[];
  categories?: string[];
  /** Specializations of a skill it is limited to (`music`: only singing is a voice). */
  specializations?: Record<string, string[]>;
  valuePerTier: number;
  /** The value is not multiplied by the tier (the talent has none). */
  fixed?: boolean;
  condition: SituationalCondition;
  mode: 'ticked' | 'automatic';
  /** Automatic ones: the purpose of the maneuver that triggers it. */
  purpose?: ManeuverPurpose;
  /**
   * Talents of the sheet whose bonus already counts in the skill and does not stack with this one (Golden Throat with
   * Perfect Pitch and Musical, the `music` group): only the excess over the highest of them is added.
   */
  notStackingWith?: { skills: string[]; traits: string[]; perTier: number };
  rule: string;
}

export const SITUATIONAL_TRAIT_BONUSES: SituationalTraitBonus[] = [
  {
    traitId: GOLDEN_THROAT,
    skills: ['influence', 'leadership', 'music'],
    specializations: { music: ['singing'] },
    valuePerTier: 10,
    condition: 'calm-or-persuade',
    mode: 'ticked',
    notStackingWith: { skills: ['music'], traits: [PERFECT_PITCH, MUSICAL], perTier: 10 },
    rule: SITUATIONAL_TRAIT_RULE,
  },
  {
    traitId: EMPATHY,
    skills: ['social-awareness'],
    valuePerTier: 50,
    fixed: true,
    condition: 'read-emotions',
    mode: 'ticked',
    rule: SITUATIONAL_TRAIT_RULE,
  },
  {
    traitId: ANIMAL_EMPATHY,
    skills: ['animal-handling', 'animal-training', 'riding'],
    valuePerTier: 25,
    fixed: true,
    condition: 'animal-of-its-type',
    mode: 'ticked',
    rule: SITUATIONAL_TRAIT_RULE,
  },
  { traitId: EXTRA_JOINTS, valuePerTier: 20, fixed: true, condition: 'flexible-limb', mode: 'ticked', rule: SITUATIONAL_TRAIT_RULE },
  {
    traitId: LIGHT_SLEEPER,
    skills: ['perception'],
    valuePerTier: 25,
    fixed: true,
    condition: 'wake-up',
    mode: 'ticked',
    rule: SITUATIONAL_TRAIT_RULE,
  },
  {
    traitId: HEAVY_SLEEPER,
    skills: ['perception'],
    valuePerTier: -25,
    fixed: true,
    condition: 'wake-up',
    mode: 'ticked',
    rule: SITUATIONAL_TRAIT_RULE,
  },
  {
    traitId: WINGS_VESTIGIAL,
    valuePerTier: 10,
    fixed: true,
    condition: 'fall-control',
    mode: 'automatic',
    purpose: FALL_CONTROL,
    rule: SITUATIONAL_TRAIT_RULE,
  },
];

/**
 * Odour of the target of a Perception or Tracking maneuver by smell (workspace spec 079, D3): Neutral Odor -50, Distinct
 * Odor +50. Read from the target's talents, so it is automatic.
 */
export const TARGET_ODOR_BONUSES: { traitId: string; value: number }[] = [
  { traitId: NEUTRAL_ODOR, value: -50 },
  { traitId: DISTINCT_ODOR, value: 50 },
];
export const ODOR_SKILLS = ['perception', 'tracking'];

/** What the maneuver rolls. */
export interface SituationalManeuver {
  skillId: string;
  specialization?: string | null;
  categoryId?: string | null;
  purpose?: ManeuverPurpose;
}

/** A situational talent the actor has for the maneuver, with its value. */
export interface SituationalTraitOption {
  traitId: string;
  value: number;
  tier: number;
  condition: SituationalCondition;
  mode: 'ticked' | 'automatic';
  rule: string;
  /** The trait's specialization (the animal type of Animal Empathy). */
  specialization?: string;
  /** Golden Throat on Singing: the bonus of Perfect Pitch or Musical the sheet already counts. */
  replaces?: number;
}

const appliesToSkill = (entry: SituationalTraitBonus, maneuver: SituationalManeuver): boolean => {
  if (!entry.skills?.length && !entry.categories?.length) return true;
  const bySkill = !!entry.skills?.includes(maneuver.skillId);
  const byCategory = !!maneuver.categoryId && !!entry.categories?.includes(maneuver.categoryId);
  if (!bySkill && !byCategory) return false;
  const specializations = entry.specializations?.[maneuver.skillId];
  return !specializations || (!!maneuver.specialization && specializations.includes(maneuver.specialization));
};

/** The situational talents of the actor that can apply to the maneuver (the automatic ones only with their purpose). */
export function situationalTraitOptions(traits: ActorRoundTrait[] | undefined, maneuver: SituationalManeuver): SituationalTraitOption[] {
  return SITUATIONAL_TRAIT_BONUSES.flatMap(entry => {
    const tier = ActorRoundTrait.tierOf(traits, entry.traitId);
    if (!tier || !appliesToSkill(entry, maneuver)) return [];
    if (entry.mode === 'automatic' && entry.purpose !== maneuver.purpose) return [];
    let value = entry.fixed ? entry.valuePerTier : entry.valuePerTier * tier;
    let replaces: number | undefined;
    if (entry.notStackingWith?.skills.includes(maneuver.skillId)) {
      const sheet = Math.max(
        0,
        ...entry.notStackingWith.traits.map(id => ActorRoundTrait.tierOf(traits, id) * entry.notStackingWith!.perTier),
      );
      if (sheet > 0) {
        replaces = sheet;
        value = Math.max(0, value - sheet);
      }
    }
    const specialization = (traits || []).find(trait => trait.traitId === entry.traitId)?.specialization ?? undefined;
    const option: SituationalTraitOption = {
      traitId: entry.traitId,
      value,
      tier,
      condition: entry.condition,
      mode: entry.mode,
      rule: entry.rule,
    };
    if (specialization) option.specialization = specialization;
    if (replaces !== undefined) option.replaces = replaces;
    return [option];
  });
}

const lineOf = (option: SituationalTraitOption): KeyValueModifier => {
  const params: ModifierParams = { trait: option.traitId, condition: option.condition, tier: option.tier };
  if (option.specialization) params.specialization = option.specialization;
  if (option.replaces !== undefined) params.replaces = option.replaces;
  return new KeyValueModifier(`situational-${option.traitId}`, option.value, 'talent', 'situational-talents', option.rule, params);
};

/**
 * The lines of the situational talents (workspace spec 079, D3): one per talent the game master ticked, which must be
 * one the actor has for this skill (`err-maneuver-situational-trait`), and the automatic ones of the purpose.
 */
export function situationalTraitModifiers(
  traits: ActorRoundTrait[] | undefined,
  maneuver: SituationalManeuver,
  ticked: string[] = [],
): KeyValueModifier[] {
  const options = situationalTraitOptions(traits, maneuver);
  const unknown = [...new Set(ticked)].filter(id => !options.some(option => option.traitId === id && option.mode === 'ticked'));
  if (unknown.length) {
    throw new ValidationError(`Situational talents that do not apply to this maneuver: ${unknown.join(', ')}`, ERR_SITUATIONAL_TRAIT);
  }
  return options
    .filter(option => option.mode === 'automatic' || ticked.includes(option.traitId))
    .map(lineOf)
    .filter(line => line.value !== 0 || line.params?.replaces !== undefined);
}

/**
 * Neutral and Distinct Odor of the target of a Perception or Tracking maneuver made by smell (workspace spec 079, D3).
 * Empty for another sense, skill or without a target.
 */
export function targetOdorModifiers(
  targetTraits: ActorRoundTrait[] | undefined,
  skillId: string,
  sense: string | undefined,
  targetName?: string,
): KeyValueModifier[] {
  if (sense !== 'smell' || !ODOR_SKILLS.includes(skillId)) return [];
  return TARGET_ODOR_BONUSES.filter(entry => ActorRoundTrait.tierOf(targetTraits, entry.traitId) > 0).map(
    entry =>
      new KeyValueModifier(`target-${entry.traitId}`, entry.value, 'senses', 'situational-talents', SITUATIONAL_TRAIT_RULE, {
        trait: entry.traitId,
        sense: 'smell',
        ...(targetName ? { target: targetName } : {}),
      }),
  );
}
